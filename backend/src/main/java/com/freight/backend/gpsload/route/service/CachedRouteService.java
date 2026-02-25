package com.freight.backend.gpsload.route.service;

import com.freight.backend.gpsload.route.model.Place;
import com.freight.backend.gpsload.route.model.RouteRequest;
import com.freight.backend.gpsload.route.model.RouteResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.LocalDate;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.atomic.AtomicLong;

/**
 * Cached route distance service.
 * - Redis cache + memory LRU cache
 * - Daily/per-minute API rate limiting and backoff
 * - Optional single-flight dedupe for same route key
 */
@Service
public class CachedRouteService {

    private static final Logger log = LoggerFactory.getLogger(CachedRouteService.class);

    private static final String CACHE_PREFIX = "route:distance:";

    private final KakaoRouteService kakaoRouteService;
    private final RedisTemplate<String, Object> redisTemplate;

    private static final double HAVERSINE_MULTIPLIER = 1.4;

    // API protection limits
    private static final int MAX_DAILY_CALLS = 10000;
    private static final int MAX_CALLS_PER_MINUTE = 100;
    private static final int MAX_CONSECUTIVE_FAILURES = 5;
    private static final long BACKOFF_DURATION_MS = 30000;

    // Memory LRU cache
    private static final int MEMORY_CACHE_SIZE = 5000;
    private final Map<String, RouteDistance> memoryCache = new LinkedHashMap<>(MEMORY_CACHE_SIZE, 0.75f, true) {
        @Override
        protected boolean removeEldestEntry(Map.Entry<String, RouteDistance> eldest) {
            return size() > MEMORY_CACHE_SIZE;
        }
    };

    // Same-key request dedupe to prevent duplicate concurrent API calls
    private final Map<String, CompletableFuture<RouteDistance>> inFlightRequests = new ConcurrentHashMap<>();

    // Counters
    private final AtomicInteger dailyCallCount = new AtomicInteger(0);
    private final AtomicInteger minuteCallCount = new AtomicInteger(0);
    private final AtomicInteger consecutiveFailures = new AtomicInteger(0);
    private final AtomicLong lastMinuteReset = new AtomicLong(System.currentTimeMillis());
    private final AtomicLong backoffUntil = new AtomicLong(0);
    private volatile LocalDate lastDailyReset = LocalDate.now();

    @Value("${route.traffic.live-enabled:false}")
    private boolean liveTrafficEnabled;

    @Value("${route.traffic.live-cache-ttl-seconds:180}")
    private long liveCacheTtlSeconds;

    @Value("${route.traffic.snapshot-cache-ttl-hours:24}")
    private long snapshotCacheTtlHours;

    @Value("${route.traffic.live-bucket-seconds:300}")
    private long liveBucketSeconds;

    @Value("${route.traffic.single-flight-enabled:true}")
    private boolean singleFlightEnabled;

    @Value("${route.traffic.single-flight-wait-ms:4000}")
    private long singleFlightWaitMs;

    public CachedRouteService(KakaoRouteService kakaoRouteService,
                              RedisTemplate<String, Object> redisTemplate) {
        this.kakaoRouteService = kakaoRouteService;
        this.redisTemplate = redisTemplate;
        log.info("CachedRouteService initialized");
    }

    /**
     * Returns road distance and duration for two points.
     */
    public RouteDistance getDistance(Place from, Place to) {
        String cacheKey = buildCacheKey(from, to, liveTrafficEnabled);
        Duration cacheTtl = resolveCacheTtl();

        RouteDistance memoryCached = getMemoryCache(cacheKey);
        if (memoryCached != null) {
            log.trace("Memory Cache HIT: {} -> {}", formatPlace(from), formatPlace(to));
            return memoryCached;
        }

        RouteDistance redisCached = getRedisCache(cacheKey);
        if (redisCached != null) {
            log.debug("Redis Cache HIT [{}]: {} -> {} = {}m", modeLabel(), formatPlace(from), formatPlace(to), redisCached.distanceM());
            putMemoryCache(cacheKey, redisCached);
            return redisCached;
        }

        if (!singleFlightEnabled) {
            return requestAndCacheDistance(cacheKey, from, to, cacheTtl);
        }

        CompletableFuture<RouteDistance> leaderFuture = new CompletableFuture<>();
        CompletableFuture<RouteDistance> existingFuture = inFlightRequests.putIfAbsent(cacheKey, leaderFuture);

        if (existingFuture != null) {
            try {
                long waitMs = Math.max(100L, singleFlightWaitMs);
                RouteDistance shared = existingFuture.get(waitMs, TimeUnit.MILLISECONDS);
                if (shared != null) {
                    return shared;
                }
            } catch (Exception e) {
                log.debug("In-flight wait failed, fallback to direct request: {}", e.getMessage());
            }
            return requestAndCacheDistance(cacheKey, from, to, cacheTtl);
        }

        try {
            RouteDistance result = requestAndCacheDistance(cacheKey, from, to, cacheTtl);
            leaderFuture.complete(result);
            return result;
        } catch (RuntimeException e) {
            leaderFuture.completeExceptionally(e);
            throw e;
        } finally {
            inFlightRequests.remove(cacheKey, leaderFuture);
        }
    }

    private RouteDistance getMemoryCache(String cacheKey) {
        synchronized (memoryCache) {
            return memoryCache.get(cacheKey);
        }
    }

    private void putMemoryCache(String cacheKey, RouteDistance distance) {
        synchronized (memoryCache) {
            memoryCache.put(cacheKey, distance);
        }
    }

    private RouteDistance getRedisCache(String cacheKey) {
        try {
            return (RouteDistance) redisTemplate.opsForValue().get(cacheKey);
        } catch (Exception e) {
            log.warn("Redis cache lookup failed: {}", e.getMessage());
            return null;
        }
    }

    private RouteDistance requestAndCacheDistance(String cacheKey, Place from, Place to, Duration cacheTtl) {
        if (!canCallApi()) {
            log.warn("API call blocked (rate limit or backoff), using fallback");
            RouteDistance fallback = calculateFallback(from, to);
            putMemoryCache(cacheKey, fallback);
            return fallback;
        }

        try {
            incrementCallCounters();

            RouteResponse response = kakaoRouteService.findRoute(
                    new RouteRequest(from, to, null),
                    liveTrafficEnabled
            );

            RouteDistance result = new RouteDistance(
                    response.distanceMeters(),
                    response.durationSeconds(),
                    false
            );
            consecutiveFailures.set(0);

            try {
                redisTemplate.opsForValue().set(cacheKey, result, cacheTtl);
                log.debug("Redis Cache SET [{}]: {} -> {} = {}m (TTL: {}s)",
                        modeLabel(),
                        formatPlace(from),
                        formatPlace(to),
                        result.distanceM(),
                        cacheTtl.getSeconds());
            } catch (Exception e) {
                log.warn("Redis cache set failed: {}", e.getMessage());
            }

            putMemoryCache(cacheKey, result);
            return result;

        } catch (Exception e) {
            log.warn("Kakao API call failed, fallback to haversine: {}", e.getMessage());
            handleApiFailure();
            RouteDistance fallback = calculateFallback(from, to);
            putMemoryCache(cacheKey, fallback);
            return fallback;
        }
    }

    private boolean canCallApi() {
        long now = System.currentTimeMillis();

        if (now < backoffUntil.get()) {
            return false;
        }

        LocalDate today = LocalDate.now();
        if (!today.equals(lastDailyReset)) {
            dailyCallCount.set(0);
            lastDailyReset = today;
            log.info("Daily API call counter reset");
        }
        if (dailyCallCount.get() >= MAX_DAILY_CALLS) {
            log.warn("Daily API limit reached: {}", dailyCallCount.get());
            return false;
        }

        if (now - lastMinuteReset.get() >= 60000) {
            minuteCallCount.set(0);
            lastMinuteReset.set(now);
        }
        if (minuteCallCount.get() >= MAX_CALLS_PER_MINUTE) {
            log.warn("Per-minute API limit reached: {}", minuteCallCount.get());
            return false;
        }

        return true;
    }

    private void incrementCallCounters() {
        dailyCallCount.incrementAndGet();
        minuteCallCount.incrementAndGet();
    }

    private void handleApiFailure() {
        int failures = consecutiveFailures.incrementAndGet();
        if (failures >= MAX_CONSECUTIVE_FAILURES) {
            long backoffEnd = System.currentTimeMillis() + BACKOFF_DURATION_MS;
            backoffUntil.set(backoffEnd);
            log.warn("Consecutive API failures: {}, entering backoff until {}", failures, backoffEnd);
        }
    }

    public ApiCallStats getApiCallStats() {
        return new ApiCallStats(
                dailyCallCount.get(),
                MAX_DAILY_CALLS,
                minuteCallCount.get(),
                MAX_CALLS_PER_MINUTE,
                consecutiveFailures.get(),
                System.currentTimeMillis() < backoffUntil.get(),
                memoryCache.size()
        );
    }

    public record ApiCallStats(
            int dailyCalls,
            int dailyLimit,
            int minuteCalls,
            int minuteLimit,
            int consecutiveFailures,
            boolean inBackoff,
            int memoryCacheSize
    ) {}

    /**
     * Returns total distance over a chain of waypoints.
     */
    public RouteDistance getTotalDistance(Place start, Place... waypoints) {
        if (waypoints == null || waypoints.length == 0) {
            return new RouteDistance(0, 0, false);
        }

        int totalDistanceM = 0;
        int totalDurationS = 0;
        boolean anyEstimate = false;

        Place prev = start;
        for (Place next : waypoints) {
            RouteDistance segment = getDistance(prev, next);
            totalDistanceM += segment.distanceM();
            totalDurationS += segment.durationS();
            if (segment.isEstimate()) {
                anyEstimate = true;
            }
            prev = next;
        }

        return new RouteDistance(totalDistanceM, totalDurationS, anyEstimate);
    }

    private RouteDistance calculateFallback(Place from, Place to) {
        double distKm = haversineDistance(
                from.latitude(), from.longitude(),
                to.latitude(), to.longitude()
        );

        int distM = (int) (distKm * HAVERSINE_MULTIPLIER * 1000);
        int durationS = (int) (distKm * HAVERSINE_MULTIPLIER / 40 * 3600);

        return new RouteDistance(distM, durationS, true);
    }

    private String buildCacheKey(Place from, Place to, boolean liveMode) {
        String mode = liveMode ? "live" : "snapshot";
        String bucketSuffix = "";
        if (liveMode) {
            long bucket = currentTrafficBucket();
            bucketSuffix = ":b" + bucket;
        }
        return CACHE_PREFIX + mode + bucketSuffix + ":"
                + String.format("%.4f,%.4f", from.latitude(), from.longitude())
                + "->"
                + String.format("%.4f,%.4f", to.latitude(), to.longitude());
    }

    private long currentTrafficBucket() {
        long seconds = System.currentTimeMillis() / 1000L;
        long bucketSize = Math.max(30L, liveBucketSeconds);
        return seconds / bucketSize;
    }

    private Duration resolveCacheTtl() {
        if (liveTrafficEnabled) {
            long ttl = Math.max(30L, liveCacheTtlSeconds);
            return Duration.ofSeconds(ttl);
        }
        long ttlHours = Math.max(1L, snapshotCacheTtlHours);
        return Duration.ofHours(ttlHours);
    }

    private String modeLabel() {
        return liveTrafficEnabled ? "LIVE" : "SNAPSHOT";
    }

    private String formatPlace(Place p) {
        return String.format("(%.4f,%.4f)", p.latitude(), p.longitude());
    }

    private double haversineDistance(double lat1, double lng1, double lat2, double lng2) {
        final double r = 6371.0;
        double dLat = Math.toRadians(lat2 - lat1);
        double dLng = Math.toRadians(lng2 - lng1);
        double a = Math.sin(dLat / 2) * Math.sin(dLat / 2)
                + Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2))
                * Math.sin(dLng / 2) * Math.sin(dLng / 2);
        double c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return r * c;
    }

    public void invalidateCache(Place from, Place to) {
        String snapshotKey = buildCacheKey(from, to, false);
        redisTemplate.delete(snapshotKey);

        synchronized (memoryCache) {
            memoryCache.remove(snapshotKey);
        }

        if (liveTrafficEnabled) {
            String liveKey = buildCacheKey(from, to, true);
            redisTemplate.delete(liveKey);
            synchronized (memoryCache) {
                memoryCache.remove(liveKey);
            }
        }
    }

    public record RouteDistance(
            int distanceM,
            int durationS,
            boolean isEstimate
    ) implements java.io.Serializable {
    }
}
