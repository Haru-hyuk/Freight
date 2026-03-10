package com.freight.backend.config;

import com.freight.backend.config.jwt.JwtTokenProvider;
import io.jsonwebtoken.JwtException;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.ArrayDeque;
import java.util.Deque;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicLong;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.lang.Nullable;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.filter.OncePerRequestFilter;

/**
 * 간단한 인메모리 슬라이딩 윈도우 기반 rate limit 필터.
 * - /api/auth/** : 인증 시도 제한
 * - /api/shipper/payments/** : 결제 API 제한
 * - /api/shipper/quotes/eta-suggestion : ETA 제안 API 제한
 * - /api/** : 전역 기본 제한
 */
@Component
@Order(Ordered.HIGHEST_PRECEDENCE + 6)
public class ApiRateLimitFilter extends OncePerRequestFilter {
    private static final Logger log = LoggerFactory.getLogger(ApiRateLimitFilter.class);
    private static final long ONE_MINUTE_MS = 60_000L;
    private static final long CLEANUP_INTERVAL_MS = 60_000L;
    private static final long BUCKET_IDLE_TTL_MS = 10 * ONE_MINUTE_MS;

    private final Map<String, SlidingWindowBucket> buckets = new ConcurrentHashMap<>();
    private final AtomicLong lastCleanupAt = new AtomicLong(0L);
    private final JwtTokenProvider jwtTokenProvider;
    @Nullable
    private final StringRedisTemplate stringRedisTemplate;

    public ApiRateLimitFilter(
            JwtTokenProvider jwtTokenProvider,
            ObjectProvider<StringRedisTemplate> stringRedisTemplateProvider
    ) {
        this.jwtTokenProvider = jwtTokenProvider;
        this.stringRedisTemplate = stringRedisTemplateProvider.getIfAvailable();
    }

    @Value("${app.rate-limit.enabled:true}")
    private boolean enabled;

    @Value("${app.rate-limit.auth-max-per-minute:20}")
    private int authMaxPerMinute;

    @Value("${app.rate-limit.payment-max-per-minute:10}")
    private int paymentMaxPerMinute;

    @Value("${app.rate-limit.eta-max-per-minute:30}")
    private int etaMaxPerMinute;

    @Value("${app.rate-limit.api-max-per-minute:240}")
    private int apiMaxPerMinute;

    @Value("${app.rate-limit.redis-enabled:true}")
    private boolean redisEnabled;

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain
    ) throws ServletException, IOException {
        if (!enabled || "OPTIONS".equalsIgnoreCase(request.getMethod())) {
            filterChain.doFilter(request, response);
            return;
        }

        String path = request.getRequestURI();
        RatePolicy policy = resolvePolicy(path);
        if (policy == null) {
            filterChain.doFilter(request, response);
            return;
        }

        long now = System.currentTimeMillis();
        String key = buildBucketKey(policy, request);
        SlidingWindowBucket.AcquireResult acquireResult = tryAcquireRedis(policy, key, now);
        if (acquireResult == null) {
            SlidingWindowBucket bucket = buckets.computeIfAbsent(key, ignored -> new SlidingWindowBucket());
            acquireResult = bucket.tryAcquire(now, policy.windowMs(), policy.limit());
        }

        if (!acquireResult.allowed()) {
            response.setStatus(429);
            response.setCharacterEncoding(StandardCharsets.UTF_8.name());
            response.setContentType("application/json;charset=UTF-8");
            long retryAfterSeconds = Math.max(1L, (long) Math.ceil(acquireResult.retryAfterMs() / 1000.0d));
            response.setHeader("Retry-After", String.valueOf(retryAfterSeconds));
            response.getWriter().write("""
                    {"code":"RATE_LIMITED","message":"요청이 너무 많습니다. 잠시 후 다시 시도해 주세요."}
                    """);
            return;
        }

        cleanupStaleBuckets(now);
        filterChain.doFilter(request, response);
    }

    @Nullable
    private SlidingWindowBucket.AcquireResult tryAcquireRedis(RatePolicy policy, String key, long now) {
        if (!redisEnabled || stringRedisTemplate == null) {
            return null;
        }

        try {
            long windowMs = Math.max(1000L, policy.windowMs());
            long windowIndex = now / windowMs;
            String redisKey = "rl:" + policy.name() + ":" + key + ":" + windowIndex;

            Long current = stringRedisTemplate.opsForValue().increment(redisKey);
            if (current == null) {
                return null;
            }

            if (Long.valueOf(1L).equals(current)) {
                long ttlMs = Math.max(1000L, (windowMs - (now % windowMs)) + 2000L);
                stringRedisTemplate.expire(redisKey, Duration.ofMillis(ttlMs));
            }

            if (current != null && current.longValue() > policy.limit()) {
                long retryAfterMs = Math.max(1L, windowMs - (now % windowMs));
                return SlidingWindowBucket.AcquireResult.denied(retryAfterMs);
            }
            return SlidingWindowBucket.AcquireResult.granted();
        } catch (Exception e) {
            log.warn("Redis rate-limit unavailable. fallback=in-memory, cause={}", e.getMessage());
            return null;
        }
    }

    private RatePolicy resolvePolicy(String path) {
        if (path == null || !path.startsWith("/api/")) {
            return null;
        }
        if (path.startsWith("/api/auth/")) {
            return new RatePolicy("auth", ONE_MINUTE_MS, Math.max(1, authMaxPerMinute), false);
        }
        if (path.startsWith("/api/shipper/quotes/eta-suggestion")) {
            return new RatePolicy("eta", ONE_MINUTE_MS, Math.max(1, etaMaxPerMinute), false);
        }
        if (path.startsWith("/api/shipper/payments/")) {
            return new RatePolicy("payment", ONE_MINUTE_MS, Math.max(1, paymentMaxPerMinute), false);
        }
        if (path.startsWith("/api/")) {
            return new RatePolicy("api", ONE_MINUTE_MS, Math.max(1, apiMaxPerMinute), true);
        }
        return null;
    }

    private String buildBucketKey(RatePolicy policy, HttpServletRequest request) {
        StringBuilder key = new StringBuilder();
        key.append(policy.name()).append(":").append(resolveClientScope(request));
        if (policy.routeScoped()) {
            key.append(":").append(resolveRouteScope(request));
        }
        return key.toString();
    }

    private String resolveClientScope(HttpServletRequest request) {
        String token = jwtTokenProvider.resolveToken(request);
        if (StringUtils.hasText(token)) {
            try {
                String userId = jwtTokenProvider.getUserIdFromToken(token);
                if (StringUtils.hasText(userId)) {
                    return "uid:" + userId.trim();
                }
            } catch (JwtException | IllegalArgumentException ignored) {
                // 토큰이 없거나 파싱 실패한 경우 IP 단위로 폴백
            }
        }
        return "ip:" + resolveClientIp(request);
    }

    private String resolveRouteScope(HttpServletRequest request) {
        String method = request.getMethod() == null ? "GET" : request.getMethod().toUpperCase();
        String path = normalizePath(request.getRequestURI());
        String[] segments = path.split("/");
        String group;
        if (segments.length >= 4) {
            group = segments[2] + "/" + segments[3];
        } else if (segments.length >= 3) {
            group = segments[2];
        } else {
            group = "root";
        }
        return method + ":" + group;
    }

    private String normalizePath(String path) {
        if (!StringUtils.hasText(path)) {
            return "/api";
        }
        String normalized = path.trim();
        if (normalized.endsWith("/") && normalized.length() > 1) {
            normalized = normalized.substring(0, normalized.length() - 1);
        }
        return normalized;
    }

    private String resolveClientIp(HttpServletRequest request) {
        String xff = request.getHeader("X-Forwarded-For");
        if (xff != null && !xff.isBlank()) {
            return xff.split(",")[0].trim();
        }
        String xri = request.getHeader("X-Real-IP");
        if (xri != null && !xri.isBlank()) {
            return xri.trim();
        }
        return request.getRemoteAddr() == null ? "unknown" : request.getRemoteAddr();
    }

    private void cleanupStaleBuckets(long now) {
        long previous = lastCleanupAt.get();
        if (now - previous < CLEANUP_INTERVAL_MS) {
            return;
        }
        if (!lastCleanupAt.compareAndSet(previous, now)) {
            return;
        }
        buckets.entrySet().removeIf(entry -> entry.getValue().isExpired(now, BUCKET_IDLE_TTL_MS));
    }

    private record RatePolicy(String name, long windowMs, int limit, boolean routeScoped) {
    }

    private static final class SlidingWindowBucket {
        private final Deque<Long> requests = new ArrayDeque<>();
        private long lastSeenAt = 0L;

        synchronized AcquireResult tryAcquire(long now, long windowMs, int limit) {
            trimOld(now, windowMs);
            if (requests.size() >= limit) {
                lastSeenAt = now;
                Long oldest = requests.peekFirst();
                long retryAfterMs = oldest == null ? windowMs : Math.max(1L, windowMs - (now - oldest));
                return AcquireResult.denied(retryAfterMs);
            }
            requests.addLast(now);
            lastSeenAt = now;
            return AcquireResult.granted();
        }

        synchronized boolean isExpired(long now, long ttlMs) {
            trimOld(now, ONE_MINUTE_MS);
            return requests.isEmpty() && (now - lastSeenAt) > ttlMs;
        }

        private void trimOld(long now, long windowMs) {
            long cutoff = now - windowMs;
            while (!requests.isEmpty() && requests.peekFirst() <= cutoff) {
                requests.pollFirst();
            }
        }

        private record AcquireResult(boolean allowed, long retryAfterMs) {
            private static AcquireResult granted() {
                return new AcquireResult(true, 0L);
            }

            private static AcquireResult denied(long retryAfterMs) {
                return new AcquireResult(false, Math.max(1L, retryAfterMs));
            }
        }
    }
}
