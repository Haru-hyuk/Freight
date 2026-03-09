package com.freight.backend.geocoding;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.freight.backend.exception.CustomException;
import com.freight.backend.exception.ErrorCode;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDateTime;
import java.util.HexFormat;
import java.util.Locale;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientResponseException;
import org.springframework.web.client.ResourceAccessException;

@Service
@Slf4j
public class GeocodingService {

    private static final int MAX_ATTEMPTS = 2;
    private static final long DEFAULT_CACHE_TTL_SECONDS = 86400L;
    private static final String REDIS_CACHE_PREFIX = "geocoding:address:";

    private final RestClient restClient;
    private final ObjectMapper objectMapper;
    private final GeocodingCacheRepository geocodingCacheRepository;
    private final RedisTemplate<String, Object> redisTemplate;
    private final long cacheTtlSeconds;
    private final long redisCacheTtlSeconds;
    private final boolean hasApiKey;
    private final Map<String, CachedGeocoding> cache = new ConcurrentHashMap<>();

    public GeocodingService(
            RestClient.Builder restClientBuilder,
            GeocodingCacheRepository geocodingCacheRepository,
            ObjectProvider<RedisTemplate<String, Object>> redisTemplateProvider,
            @Value("${geocoding.kakao.base-url:https://dapi.kakao.com}") String baseUrl,
            @Value("${geocoding.kakao.api-key:}") String apiKey,
            @Value("${geocoding.timeout-ms:2000}") int timeoutMs,
            @Value("${geocoding.cache.ttl-seconds:86400}") long cacheTtlSeconds,
            @Value("${geocoding.cache.redis-ttl-seconds:86400}") long redisCacheTtlSeconds
    ) {
        this.objectMapper = new ObjectMapper();
        this.geocodingCacheRepository = geocodingCacheRepository;
        this.redisTemplate = redisTemplateProvider.getIfAvailable();
        this.cacheTtlSeconds = cacheTtlSeconds > 0 ? cacheTtlSeconds : DEFAULT_CACHE_TTL_SECONDS;
        this.redisCacheTtlSeconds = redisCacheTtlSeconds > 0 ? redisCacheTtlSeconds : DEFAULT_CACHE_TTL_SECONDS;
        this.hasApiKey = apiKey != null && !apiKey.isBlank();

        SimpleClientHttpRequestFactory requestFactory = new SimpleClientHttpRequestFactory();
        requestFactory.setConnectTimeout(timeoutMs);
        requestFactory.setReadTimeout(timeoutMs);

        this.restClient = restClientBuilder
                .baseUrl(baseUrl)
                .defaultHeader("Authorization", "KakaoAK " + apiKey)
                .requestFactory(requestFactory)
                .build();
    }

    public GeocodingResult geocode(String address) {
        String normalized = normalizeAddress(address);
        if (normalized == null) {
            throw new CustomException(ErrorCode.INVALID_REQUEST);
        }

        GeocodingResult memoryCached = getCached(normalized);
        if (memoryCached != null) {
            return memoryCached;
        }

        GeocodingResult persistentCached = readPersistentCache(normalized);
        if (persistentCached != null) {
            putMemoryCache(normalized, persistentCached);
            return persistentCached;
        }

        if (!hasApiKey) {
            log.error("Geocoding API key is not configured. address='{}'", normalized);
            throw new CustomException(ErrorCode.EXTERNAL_API_ERROR);
        }

        RuntimeException lastException = null;
        for (int attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
            try {
                log.debug("Geocode request attempt={} address='{}'", attempt, normalized);
                JsonNode addressResponse = requestGeocoding("/v2/local/search/address.json", normalized);
                GeocodingResult result = extractResult(addressResponse, normalized);
                if (result == null) {
                    JsonNode keywordResponse = requestGeocoding("/v2/local/search/keyword.json", normalized);
                    result = extractResult(keywordResponse, normalized, false);
                }
                if (result == null) {
                    log.warn("Geocode API returned no valid results. address='{}'", normalized);
                    throw new CustomException(ErrorCode.EXTERNAL_API_ERROR);
                }
                cacheResolvedResult(normalized, result);
                return result;
            } catch (RestClientResponseException e) {
                String body = e.getResponseBodyAsString();
                log.warn(
                        "Geocode HTTP error. attempt={}, status={}, address='{}', body='{}'",
                        attempt,
                        e.getStatusCode().value(),
                        normalized,
                        body == null ? "" : body
                );
                lastException = e;
            } catch (ResourceAccessException e) {
                log.warn("Geocode network error. attempt={}, address='{}', cause='{}'",
                        attempt, normalized, e.getMessage());
                lastException = e;
            } catch (RuntimeException e) {
                log.warn("Geocode runtime error. attempt={}, address='{}', cause='{}'",
                        attempt, normalized, e.getMessage());
                lastException = e;
            }
        }

        if (lastException != null) {
            log.error("Geocoding failed after {} attempts. address='{}', cause='{}'", MAX_ATTEMPTS, normalized, lastException.getMessage());
            throw new CustomException(ErrorCode.EXTERNAL_API_ERROR);
        }
        throw new CustomException(ErrorCode.EXTERNAL_API_ERROR);
    }

    private JsonNode requestGeocoding(String path, String query) {
        String raw = restClient.get()
                .uri(uriBuilder -> uriBuilder
                        .path(path)
                        .queryParam("query", query)
                        .build())
                .retrieve()
                .body(String.class);
        return parseJson(raw);
    }

    public boolean isValidCoordinate(Double lat, Double lng) {
        if (lat == null || lng == null) {
            return false;
        }
        if (lat == 0.0d || lng == 0.0d) {
            return false;
        }
        return lat >= -90.0d && lat <= 90.0d && lng >= -180.0d && lng <= 180.0d;
    }

    private GeocodingResult getCached(String normalizedAddress) {
        CachedGeocoding cached = cache.get(normalizedAddress);
        if (cached == null) {
            return null;
        }
        if (Instant.now().isAfter(cached.expireAt())) {
            cache.remove(normalizedAddress);
            return null;
        }
        return cached.result();
    }

    private GeocodingResult readPersistentCache(String normalizedAddress) {
        String cacheKey = cacheKey(normalizedAddress);
        GeocodingResult redisCached = readRedisCache(cacheKey);
        if (redisCached != null) {
            return redisCached;
        }
        return readDatabaseCache(cacheKey);
    }

    private GeocodingResult readRedisCache(String cacheKey) {
        if (redisTemplate == null) {
            return null;
        }
        try {
            Object raw = redisTemplate.opsForValue().get(toRedisKey(cacheKey));
            if (raw == null) {
                return null;
            }
            JsonNode node = parseJson(String.valueOf(raw));
            double lat = node.path("lat").asDouble(Double.NaN);
            double lng = node.path("lng").asDouble(Double.NaN);
            String normalizedAddress = node.path("normalizedAddress").asText("");
            if (!isValidCoordinate(lat, lng) || normalizedAddress.isBlank()) {
                return null;
            }
            return new GeocodingResult(lat, lng, normalizedAddress);
        } catch (Exception ignored) {
            return null;
        }
    }

    private GeocodingResult readDatabaseCache(String cacheKey) {
        try {
            GeocodingCache cacheRow = geocodingCacheRepository.findByCacheKey(cacheKey).orElse(null);
            if (cacheRow == null) {
                return null;
            }
            if (cacheRow.getExpireAt() == null || cacheRow.getExpireAt().isBefore(LocalDateTime.now())) {
                geocodingCacheRepository.delete(cacheRow);
                return null;
            }
            if (!isValidCoordinate(cacheRow.getLat(), cacheRow.getLng())) {
                return null;
            }
            GeocodingResult result = new GeocodingResult(
                    cacheRow.getLat(),
                    cacheRow.getLng(),
                    cacheRow.getResolvedAddress()
            );
            writeRedisCache(cacheRow.getCacheKey(), result);
            return result;
        } catch (Exception ignored) {
            return null;
        }
    }

    private void cacheResolvedResult(String normalizedAddress, GeocodingResult result) {
        putMemoryCache(normalizedAddress, result);
        persistCache(normalizedAddress, result);
    }

    private void putMemoryCache(String normalizedAddress, GeocodingResult result) {
        cache.put(normalizedAddress, new CachedGeocoding(result, Instant.now().plusSeconds(cacheTtlSeconds)));
    }

    private void persistCache(String normalizedAddress, GeocodingResult result) {
        if (result == null || !isValidCoordinate(result.lat(), result.lng())) {
            return;
        }
        String cacheKey = cacheKey(normalizedAddress);
        LocalDateTime expireAt = LocalDateTime.now().plusSeconds(cacheTtlSeconds);
        try {
            GeocodingCache cacheRow = geocodingCacheRepository.findByCacheKey(cacheKey)
                    .orElse(GeocodingCache.builder().cacheKey(cacheKey).build());
            cacheRow.refresh(
                    normalizedAddress,
                    result.lat(),
                    result.lng(),
                    result.normalizedAddress(),
                    expireAt
            );
            geocodingCacheRepository.save(cacheRow);
        } catch (Exception e) {
            log.debug("geocoding DB cache write skipped. reason={}", e.getMessage());
        }
        writeRedisCache(cacheKey, result);
    }

    private void writeRedisCache(String cacheKey, GeocodingResult result) {
        if (redisTemplate == null || result == null || !isValidCoordinate(result.lat(), result.lng())) {
            return;
        }
        try {
            String payload = objectMapper.writeValueAsString(Map.of(
                    "lat", result.lat(),
                    "lng", result.lng(),
                    "normalizedAddress", result.normalizedAddress()
            ));
            redisTemplate.opsForValue().set(
                    toRedisKey(cacheKey),
                    payload,
                    Duration.ofSeconds(redisCacheTtlSeconds)
            );
        } catch (Exception ignored) {
            // Redis write is best effort.
        }
    }

    private String toRedisKey(String cacheKey) {
        return REDIS_CACHE_PREFIX + cacheKey;
    }

    private String cacheKey(String normalizedAddress) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(normalizedAddress.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(hash);
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 algorithm is unavailable", e);
        }
    }

    private GeocodingResult extractResult(JsonNode response, String fallbackAddress) {
        if (response == null) {
            throw new CustomException(ErrorCode.EXTERNAL_API_ERROR);
        }

        JsonNode documents = response.path("documents");
        if (!documents.isArray() || documents.isEmpty()) {
            return null;
        }

        JsonNode first = documents.get(0);
        String x = first.path("x").asText(null);
        String y = first.path("y").asText(null);
        if (x == null || y == null) {
            throw new CustomException(ErrorCode.EXTERNAL_API_ERROR);
        }

        try {
            double lng = Double.parseDouble(x);
            double lat = Double.parseDouble(y);
            if (!isValidCoordinate(lat, lng)) {
                throw new CustomException(ErrorCode.EXTERNAL_API_ERROR);
            }

            String normalizedAddress = readNormalizedAddress(first, fallbackAddress);
            if (!isRegionCompatible(fallbackAddress, normalizedAddress)) {
                log.warn("Geocode region mismatch. query='{}', candidate='{}'", fallbackAddress, normalizedAddress);
                return null;
            }
            return new GeocodingResult(lat, lng, normalizedAddress);
        } catch (NumberFormatException e) {
            throw new CustomException(ErrorCode.EXTERNAL_API_ERROR);
        }
    }

    private GeocodingResult extractResult(JsonNode response, String fallbackAddress, boolean strictMatch) {
        GeocodingResult result = extractResult(response, fallbackAddress);
        if (result == null) {
            return null;
        }
        if (!strictMatch) {
            return result;
        }
        if (isPlausibleFallbackMatch(fallbackAddress, result.normalizedAddress())) {
            return result;
        }
        log.warn(
                "Geocode fallback mismatch. query='{}', candidate='{}'",
                fallbackAddress,
                result.normalizedAddress()
        );
        return null;
    }

    private boolean isPlausibleFallbackMatch(String query, String candidateAddress) {
        if (query == null || candidateAddress == null) {
            return false;
        }
        String q = query.replaceAll("\\s+", "");
        String c = candidateAddress.replaceAll("\\s+", "");

        String[] tokens = q.split("(?<=\\D)(?=\\d)|(?<=\\d)(?=\\D)");
        for (String token : tokens) {
            if (token == null || token.length() < 2) {
                continue;
            }
            if (c.contains(token)) {
                return true;
            }
        }
        return false;
    }

    private String readNormalizedAddress(JsonNode first, String fallbackAddress) {
        String normalizedAddress = first.path("road_address_name").asText(null);
        if (normalizedAddress == null || normalizedAddress.isBlank()) {
            normalizedAddress = first.path("address_name").asText(null);
        }
        if (normalizedAddress == null || normalizedAddress.isBlank()) {
            normalizedAddress = fallbackAddress;
        }
        return normalizedAddress;
    }

    private boolean isRegionCompatible(String queryAddress, String candidateAddress) {
        String queryRegion = extractRegionToken(queryAddress);
        if (queryRegion == null) {
            return true;
        }
        String candidateRegion = extractRegionToken(candidateAddress);
        if (candidateRegion == null) {
            return false;
        }
        if (!queryRegion.equals(candidateRegion)) {
            return false;
        }

        String queryDistrict = extractDistrictToken(queryAddress);
        if (queryDistrict == null) {
            return true;
        }
        String candidateDistrict = extractDistrictToken(candidateAddress);
        if (candidateDistrict == null) {
            return false;
        }
        return queryDistrict.equals(candidateDistrict);
    }

    private String extractRegionToken(String address) {
        String text = normalizeTextForRegion(address);
        if (text.isBlank()) {
            return null;
        }
        if (containsAny(text, "서울", "서울특별시")) return "SEOUL";
        if (containsAny(text, "부산", "부산광역시")) return "BUSAN";
        if (containsAny(text, "대구", "대구광역시")) return "DAEGU";
        if (containsAny(text, "인천", "인천광역시")) return "INCHEON";
        if (containsAny(text, "광주", "광주광역시")) return "GWANGJU";
        if (containsAny(text, "대전", "대전광역시")) return "DAEJEON";
        if (containsAny(text, "울산", "울산광역시")) return "ULSAN";
        if (containsAny(text, "세종", "세종특별자치시")) return "SEJONG";
        if (containsAny(text, "경기", "경기도")) return "GYEONGGI";
        if (containsAny(text, "강원", "강원도", "강원특별자치도")) return "GANGWON";
        if (containsAny(text, "충북", "충청북도")) return "CHUNGBUK";
        if (containsAny(text, "충남", "충청남도")) return "CHUNGNAM";
        if (containsAny(text, "전북", "전라북도", "전북특별자치도")) return "JEONBUK";
        if (containsAny(text, "전남", "전라남도")) return "JEONNAM";
        if (containsAny(text, "경북", "경상북도")) return "GYEONGBUK";
        if (containsAny(text, "경남", "경상남도")) return "GYEONGNAM";
        if (containsAny(text, "제주", "제주특별자치도")) return "JEJU";
        return null;
    }

    private String normalizeTextForRegion(String value) {
        return value == null ? "" : value.trim().toLowerCase(Locale.ROOT);
    }

    private String extractDistrictToken(String address) {
        String text = normalizeTextForRegion(address);
        if (text.isBlank()) {
            return null;
        }

        String[] tokens = text.split("\\s+");
        for (String token : tokens) {
            String clean = token.replaceAll("[^\\p{IsAlphabetic}\\p{IsDigit}가-힣]", "");
            if (clean.endsWith("구") || clean.endsWith("군") || clean.endsWith("시")) {
                return clean;
            }
        }
        return null;
    }

    private boolean containsAny(String text, String... tokens) {
        if (text == null || text.isBlank() || tokens == null || tokens.length == 0) {
            return false;
        }
        for (String token : tokens) {
            if (token == null || token.isBlank()) {
                continue;
            }
            if (text.contains(token.toLowerCase(Locale.ROOT))) {
                return true;
            }
        }
        return false;
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

    private String normalizeAddress(String address) {
        if (address == null) {
            return null;
        }
        String normalized = address.trim().replaceAll("\\s+", " ");
        if (normalized.isEmpty()) {
            return null;
        }

        // Strip details that often break geocoding matches.
        normalized = normalized.replaceAll("\\([^)]*\\)", " ");
        normalized = normalized.replaceAll(",.*$", " ");
        normalized = normalized.replaceAll("\\s+", " ").trim();

        // Remove trailing unit details like "101동", "1201호", "3층".
        normalized = normalized.replaceAll("\\s+\\d+(동|호|층)$", "");

        // Remove extra trailing number only when there is another number before it.
        // Example: "삼양로123가길 5 1" -> "삼양로123가길 5"
        normalized = normalized.replaceAll("(.*\\d)\\s+\\d+$", "$1").trim();

        return normalized.isEmpty() ? null : normalized;
    }

    private record CachedGeocoding(GeocodingResult result, Instant expireAt) {
    }
}
