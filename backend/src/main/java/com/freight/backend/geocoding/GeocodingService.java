package com.freight.backend.geocoding;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.freight.backend.exception.CustomException;
import com.freight.backend.exception.ErrorCode;
import java.io.IOException;
import java.time.Instant;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
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

    private final RestClient restClient;
    private final ObjectMapper objectMapper;
    private final long cacheTtlSeconds;
    private final boolean hasApiKey;
    private final Map<String, CachedGeocoding> cache = new ConcurrentHashMap<>();

    public GeocodingService(
            RestClient.Builder restClientBuilder,
            @Value("${geocoding.kakao.base-url:https://dapi.kakao.com}") String baseUrl,
            @Value("${geocoding.kakao.api-key:}") String apiKey,
            @Value("${geocoding.timeout-ms:2000}") int timeoutMs,
            @Value("${geocoding.cache.ttl-seconds:86400}") long cacheTtlSeconds
    ) {
        this.objectMapper = new ObjectMapper();
        this.cacheTtlSeconds = cacheTtlSeconds > 0 ? cacheTtlSeconds : DEFAULT_CACHE_TTL_SECONDS;
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
        if (!hasApiKey) {
            throw new CustomException(ErrorCode.EXTERNAL_API_ERROR);
        }
        String normalized = normalizeAddress(address);
        if (normalized == null) {
            throw new CustomException(ErrorCode.INVALID_REQUEST);
        }

        GeocodingResult cached = getCached(normalized);
        if (cached != null) {
            return cached;
        }

        RuntimeException lastException = null;
        for (int attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
            try {
                log.debug("Geocode request attempt={} address='{}'", attempt, normalized);
                JsonNode addressResponse = requestGeocoding("/v2/local/search/address.json", normalized);
                GeocodingResult result = extractResult(addressResponse, normalized);
                if (result == null) {
                    JsonNode keywordResponse = requestGeocoding("/v2/local/search/keyword.json", normalized);
                    result = extractResult(keywordResponse, normalized, true);
                }
                if (result == null) {
                    log.warn("Geocode no documents after fallback. address='{}'", normalized);
                    throw new CustomException(ErrorCode.EXTERNAL_API_ERROR);
                }
                cache.put(normalized, new CachedGeocoding(result, Instant.now().plusSeconds(cacheTtlSeconds)));
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
            throw lastException;
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
