package com.freight.backend.gpsload.route.client;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.UriComponentsBuilder;

@Component
public class KakaoPlaceClient {

    private final RestTemplate restTemplate;
    private final ObjectMapper objectMapper = new ObjectMapper();

    @Value("${kakao.rest-api-key:}")
    private String kakaoRestApiKey;

    @Value("${kakao.base-url:https://dapi.kakao.com}")
    private String kakaoBaseUrl;

    public KakaoPlaceClient(@Qualifier("externalApiRestTemplate") RestTemplate restTemplate) {
        this.restTemplate = restTemplate;
    }

    public JsonNode searchKeyword(String query) {
        return search(query);
    }

    public JsonNode search(String query) {
        if (kakaoBaseUrl == null || kakaoBaseUrl.isBlank() || kakaoRestApiKey == null || kakaoRestApiKey.isBlank()) {
            ObjectNode payload = objectMapper.createObjectNode();
            payload.put("status", "NO_API_KEY");
            payload.set("documents", objectMapper.createArrayNode());
            return payload;
        }

        String normalized = normalizeQuery(query);
        if (normalized.isBlank()) {
            ObjectNode payload = objectMapper.createObjectNode();
            payload.put("status", "INVALID_QUERY");
            payload.set("documents", objectMapper.createArrayNode());
            return payload;
        }

        JsonNode addressResponse = request("/v2/local/search/address.json", normalized);
        if (hasDocuments(addressResponse)) {
            return addressResponse;
        }

        JsonNode keywordResponse = request("/v2/local/search/keyword.json", normalized);
        if (hasDocuments(keywordResponse)) {
            return keywordResponse;
        }

        String relaxed = relaxQuery(normalized);
        if (!relaxed.equals(normalized)) {
            JsonNode relaxedKeyword = request("/v2/local/search/keyword.json", relaxed);
            if (hasDocuments(relaxedKeyword)) {
                return relaxedKeyword;
            }
            JsonNode relaxedAddress = request("/v2/local/search/address.json", relaxed);
            if (hasDocuments(relaxedAddress)) {
                return relaxedAddress;
            }
        }

        ObjectNode empty = objectMapper.createObjectNode();
        empty.put("status", "ZERO_RESULTS");
        ArrayNode docs = objectMapper.createArrayNode();
        empty.set("documents", docs);
        return empty;
    }

    private JsonNode request(String path, String query) {
        UriComponentsBuilder builder = UriComponentsBuilder
                .fromUriString(kakaoBaseUrl + path)
                .queryParam("query", query)
                .queryParam("size", 10);

        HttpHeaders headers = new HttpHeaders();
        headers.set("Authorization", "KakaoAK " + kakaoRestApiKey);

        HttpEntity<Void> entity = new HttpEntity<>(headers);
        ResponseEntity<String> response = restTemplate.exchange(
                builder.build().encode().toUri(),
                HttpMethod.GET,
                entity,
                String.class
        );

        try {
            return objectMapper.readTree(response.getBody());
        } catch (Exception e) {
            throw new IllegalStateException("Failed to parse Kakao place response", e);
        }
    }

    private boolean hasDocuments(JsonNode payload) {
        return payload != null && payload.path("documents").isArray() && !payload.path("documents").isEmpty();
    }

    private String normalizeQuery(String query) {
        if (query == null) {
            return "";
        }
        return query.trim().replaceAll("\\s+", " ");
    }

    private String relaxQuery(String query) {
        if (query == null || query.isBlank()) {
            return "";
        }
        String relaxed = query
                .replace("서울특별시", "서울")
                .replaceAll("\\([^)]*\\)", " ")
                .replaceAll(",.*$", " ")
                .replaceAll("\\s+\\d+(동|호|층)$", "")
                .replaceAll("\\s+", " ")
                .trim();
        return relaxed.isBlank() ? query : relaxed;
    }
}
