package com.freight.backend.routing;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.freight.backend.exception.CustomException;
import com.freight.backend.exception.ErrorCode;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HexFormat;
import java.util.List;
import java.util.Locale;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

@Service
public class RouteDistanceService {

    private static final int MAX_ATTEMPTS = 2;
    private static final String REDIS_CACHE_PREFIX = "routing:distance:";
    private static final String REDIS_DURATION_PREFIX = "routing:duration:";

    private final RestClient restClient;
    private final ObjectMapper objectMapper;
    private final RouteDistanceCacheRepository routeDistanceCacheRepository;
    private final RedisTemplate<String, Object> redisTemplate;
    private final boolean hasApiKey;
    private final long dbCacheTtlHours;
    private final long redisCacheTtlHours;

    public RouteDistanceService(
            RestClient.Builder restClientBuilder,
            RouteDistanceCacheRepository routeDistanceCacheRepository,
            ObjectProvider<RedisTemplate<String, Object>> redisTemplateProvider,
            @Value("${routing.kakao.base-url:https://apis-navi.kakaomobility.com}") String baseUrl,
            @Value("${routing.kakao.api-key:}") String apiKey,
            @Value("${routing.timeout-ms:3000}") int timeoutMs,
            @Value("${routing.cache.ttl-hours:720}") long dbCacheTtlHours,
            @Value("${routing.cache.redis-ttl-hours:24}") long redisCacheTtlHours
    ) {
        this.objectMapper = new ObjectMapper();
        this.routeDistanceCacheRepository = routeDistanceCacheRepository;
        this.redisTemplate = redisTemplateProvider.getIfAvailable();
        this.hasApiKey = apiKey != null && !apiKey.isBlank();
        this.dbCacheTtlHours = Math.max(1L, dbCacheTtlHours);
        this.redisCacheTtlHours = Math.max(1L, redisCacheTtlHours);

        SimpleClientHttpRequestFactory requestFactory = new SimpleClientHttpRequestFactory();
        requestFactory.setConnectTimeout(timeoutMs);
        requestFactory.setReadTimeout(timeoutMs);

        this.restClient = restClientBuilder
                .baseUrl(baseUrl)
                .defaultHeader("Authorization", "KakaoAK " + apiKey)
                .requestFactory(requestFactory)
                .build();
    }

    public int calculateDistanceKm(List<RoutePoint> points) {
        return calculateRouteMetrics(points).distanceKm();
    }

    public Integer calculateDurationSeconds(List<RoutePoint> points) {
        Integer duration = calculateRouteMetrics(points).durationSeconds();
        return (duration != null && duration > 0) ? duration : null;
    }

    public RouteMetrics calculateRouteMetrics(List<RoutePoint> points) {
        if (points == null || points.size() < 2) {
            throw new CustomException(ErrorCode.INVALID_REQUEST);
        }

        String cacheKey = buildCacheKey(points);
        Integer cachedDistanceKm = readDistanceKmFromCache(cacheKey);
        Integer cachedDurationSeconds = readDurationSecondsFromRedis(cacheKey);
        if (cachedDistanceKm != null && cachedDistanceKm > 0) {
            return new RouteMetrics(cachedDistanceKm, cachedDurationSeconds, "CACHE");
        }

        if (!hasApiKey) {
            throw new CustomException(ErrorCode.EXTERNAL_API_ERROR);
        }

        RoutePoint origin = points.get(0);
        RoutePoint destination = points.get(points.size() - 1);
        List<RoutePoint> waypoints = points.size() > 2
                ? new ArrayList<>(points.subList(1, points.size() - 1))
                : List.of();

        RuntimeException lastException = null;
        for (int attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
            try {
                RouteSummary summary = fetchRouteSummary(origin, destination, waypoints);
                long meters = summary.distanceMeters();
                Integer durationSeconds = summary.durationSeconds();
                persistDistanceMeters(cacheKey, points.size(), meters);
                writeDurationSecondsToRedis(cacheKey, durationSeconds);
                int km = (int) Math.round(meters / 1000.0d);
                return new RouteMetrics(Math.max(1, km), durationSeconds, "API");
            } catch (RuntimeException e) {
                lastException = e;
            }
        }

        if (lastException != null) {
            throw lastException;
        }
        throw new CustomException(ErrorCode.EXTERNAL_API_ERROR);
    }

    private Integer readDistanceKmFromCache(String cacheKey) {
        Integer redisCached = readDistanceKmFromRedis(cacheKey);
        if (redisCached != null && redisCached > 0) {
            return redisCached;
        }
        return readDistanceKmFromDatabase(cacheKey);
    }

    private Integer readDurationSecondsFromRedis(String cacheKey) {
        if (redisTemplate == null) {
            return null;
        }
        try {
            Object cached = redisTemplate.opsForValue().get(toDurationRedisKey(cacheKey));
            if (cached == null) {
                return null;
            }
            if (cached instanceof Number number) {
                int value = number.intValue();
                return value > 0 ? value : null;
            }
            String text = String.valueOf(cached).trim();
            if (text.isEmpty()) {
                return null;
            }
            int parsed = Integer.parseInt(text);
            return parsed > 0 ? parsed : null;
        } catch (Exception e) {
            return null;
        }
    }

    private Integer readDistanceKmFromRedis(String cacheKey) {
        if (redisTemplate == null) {
            return null;
        }
        try {
            Object cached = redisTemplate.opsForValue().get(toRedisKey(cacheKey));
            if (cached == null) {
                return null;
            }
            if (cached instanceof Number number) {
                int value = number.intValue();
                return value > 0 ? value : null;
            }
            String text = String.valueOf(cached).trim();
            if (text.isEmpty()) {
                return null;
            }
            int parsed = Integer.parseInt(text);
            return parsed > 0 ? parsed : null;
        } catch (Exception e) {
            return null;
        }
    }

    private Integer readDistanceKmFromDatabase(String cacheKey) {
        try {
            RouteDistanceCache cache = routeDistanceCacheRepository.findByCacheKey(cacheKey).orElse(null);
            if (cache == null) {
                return null;
            }

            LocalDateTime now = LocalDateTime.now();
            if (cache.getExpireAt() == null || cache.getExpireAt().isBefore(now)) {
                routeDistanceCacheRepository.delete(cache);
                return null;
            }

            int meters = cache.getDistanceMeters() == null ? 0 : cache.getDistanceMeters();
            if (meters <= 0) {
                return null;
            }

            int distanceKm = Math.max(1, (int) Math.round(meters / 1000.0d));
            writeDistanceKmToRedis(cacheKey, distanceKm);
            return distanceKm;
        } catch (Exception e) {
            return null;
        }
    }

    private void persistDistanceMeters(String cacheKey, int pointCount, long metersRaw) {
        int safeMeters = (int) Math.max(1L, Math.min(metersRaw, Integer.MAX_VALUE));
        LocalDateTime expireAt = LocalDateTime.now().plusHours(dbCacheTtlHours);

        try {
            RouteDistanceCache cache = routeDistanceCacheRepository.findByCacheKey(cacheKey)
                    .orElse(RouteDistanceCache.builder().cacheKey(cacheKey).build());
            cache.refresh(pointCount, safeMeters, expireAt);
            routeDistanceCacheRepository.save(cache);
        } catch (Exception ignored) {
            // DB cache write is best-effort.
        }

        int distanceKm = Math.max(1, (int) Math.round(safeMeters / 1000.0d));
        writeDistanceKmToRedis(cacheKey, distanceKm);
    }

    private void writeDistanceKmToRedis(String cacheKey, int distanceKm) {
        if (redisTemplate == null || distanceKm <= 0) {
            return;
        }
        try {
            redisTemplate.opsForValue().set(
                    toRedisKey(cacheKey),
                    distanceKm,
                    Duration.ofHours(redisCacheTtlHours)
            );
        } catch (Exception ignored) {
            // Redis cache write is best-effort.
        }
    }

    private void writeDurationSecondsToRedis(String cacheKey, Integer durationSeconds) {
        if (redisTemplate == null || durationSeconds == null || durationSeconds <= 0) {
            return;
        }
        try {
            redisTemplate.opsForValue().set(
                    toDurationRedisKey(cacheKey),
                    durationSeconds,
                    Duration.ofHours(redisCacheTtlHours)
            );
        } catch (Exception ignored) {
            // Redis cache write is best-effort.
        }
    }

    private String toRedisKey(String cacheKey) {
        return REDIS_CACHE_PREFIX + cacheKey;
    }

    private String toDurationRedisKey(String cacheKey) {
        return REDIS_DURATION_PREFIX + cacheKey;
    }

    private RouteSummary fetchRouteSummary(RoutePoint origin, RoutePoint destination, List<RoutePoint> waypoints) {
        String originParam = toLngLat(origin);
        String destinationParam = toLngLat(destination);
        String waypointParam = toWaypointParam(waypoints);

        String raw = restClient.get()
                .uri(uriBuilder -> {
                    var builder = uriBuilder.path("/v1/directions")
                            .queryParam("origin", originParam)
                            .queryParam("destination", destinationParam)
                            .queryParam("priority", "RECOMMEND");
                    if (!waypointParam.isBlank()) {
                        builder.queryParam("waypoints", waypointParam);
                    }
                    return builder.build();
                })
                .retrieve()
                .body(String.class);
        JsonNode response = parseJson(raw);
        return parseRouteSummary(response);
    }

    private RouteSummary parseRouteSummary(JsonNode response) {
        return new RouteSummary(parseDistanceMeters(response), parseDurationSeconds(response));
    }

    private long parseDistanceMeters(JsonNode response) {
        if (response == null) {
            throw new CustomException(ErrorCode.EXTERNAL_API_ERROR);
        }
        JsonNode routes = response.path("routes");
        if (!routes.isArray() || routes.isEmpty()) {
            throw new CustomException(ErrorCode.EXTERNAL_API_ERROR);
        }
        long meters = routes.get(0).path("summary").path("distance").asLong(-1L);
        if (meters <= 0) {
            throw new CustomException(ErrorCode.EXTERNAL_API_ERROR);
        }
        return meters;
    }

    private Integer parseDurationSeconds(JsonNode response) {
        if (response == null) {
            return null;
        }
        JsonNode routes = response.path("routes");
        if (!routes.isArray() || routes.isEmpty()) {
            return null;
        }
        long durationSeconds = routes.get(0).path("summary").path("duration").asLong(-1L);
        if (durationSeconds <= 0) {
            return null;
        }
        return (int) Math.min(durationSeconds, Integer.MAX_VALUE);
    }

    private JsonNode parseJson(String raw) {
        if (raw == null || raw.isBlank()) {
            throw new CustomException(ErrorCode.EXTERNAL_API_ERROR);
        }
        try {
            return objectMapper.readTree(raw);
        } catch (IOException e) {
            throw new CustomException(ErrorCode.EXTERNAL_API_ERROR);
        }
    }

    private String toLngLat(RoutePoint point) {
        return point.lng() + "," + point.lat();
    }

    private String toWaypointParam(List<RoutePoint> waypoints) {
        if (waypoints == null || waypoints.isEmpty()) {
            return "";
        }
        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < waypoints.size(); i++) {
            if (i > 0) {
                sb.append('|');
            }
            sb.append(toLngLat(waypoints.get(i)));
        }
        return sb.toString();
    }

    private String buildCacheKey(List<RoutePoint> points) {
        StringBuilder source = new StringBuilder(points.size() * 24);
        for (int i = 0; i < points.size(); i++) {
            RoutePoint point = points.get(i);
            if (i > 0) {
                source.append('|');
            }
            source.append(formatCoordinate(point.lat()))
                    .append(',')
                    .append(formatCoordinate(point.lng()));
        }
        return sha256Hex(source.toString());
    }

    private String formatCoordinate(double value) {
        return String.format(Locale.ROOT, "%.5f", value);
    }

    private String sha256Hex(String value) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] bytes = digest.digest(value.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(bytes);
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 algorithm is unavailable", e);
        }
    }

    public record RouteMetrics(int distanceKm, Integer durationSeconds, String source) {
    }

    private record RouteSummary(long distanceMeters, Integer durationSeconds) {
    }
}
