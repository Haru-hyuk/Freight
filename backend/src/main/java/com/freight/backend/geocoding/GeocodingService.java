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
                String raw = restClient.get()
                        .uri(uriBuilder -> uriBuilder
                                .path("/v2/local/search/address.json")
                                .queryParam("query", normalized)
                                .build())
                        .retrieve()
                        .body(String.class);
                JsonNode response = parseJson(raw);
                GeocodingResult result = parseResponse(response, normalized);
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

    private GeocodingResult parseResponse(JsonNode response, String fallbackAddress) {
        if (response == null) {
            throw new CustomException(ErrorCode.EXTERNAL_API_ERROR);
        }

        JsonNode documents = response.path("documents");
        if (!documents.isArray() || documents.isEmpty()) {
            log.warn("Geocode no documents. fallbackAddress='{}', response='{}'", fallbackAddress, response);
            throw new CustomException(ErrorCode.EXTERNAL_API_ERROR);
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

            String normalizedAddress = first.path("address_name").asText(null);
            if (normalizedAddress == null || normalizedAddress.isBlank()) {
                normalizedAddress = fallbackAddress;
            }
            return new GeocodingResult(lat, lng, normalizedAddress);
        } catch (NumberFormatException e) {
            throw new CustomException(ErrorCode.EXTERNAL_API_ERROR);
        }
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
        String trimmed = address.trim();
        if (trimmed.isEmpty()) {
            return null;
        }
        return trimmed.replaceAll("\\s+", " ");
    }

    private record CachedGeocoding(GeocodingResult result, Instant expireAt) {
    }
}
