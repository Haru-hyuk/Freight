package com.freight.backend.gpsmiss.route.client;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
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

    private final RestTemplate restTemplate = new RestTemplate();
    private final ObjectMapper objectMapper = new ObjectMapper();

    @Value("${kakao.rest-api-key:}")
    private String kakaoRestApiKey;

    @Value("${kakao.base-url:https://dapi.kakao.com}")
    private String kakaoBaseUrl;

    public JsonNode searchKeyword(String query) {
        if (kakaoBaseUrl == null || kakaoBaseUrl.isBlank() || kakaoRestApiKey == null || kakaoRestApiKey.isBlank()) {
            return objectMapper.createObjectNode().set("documents", objectMapper.createArrayNode());
        }

        UriComponentsBuilder builder = UriComponentsBuilder
                .fromUriString(kakaoBaseUrl + "/v2/local/search/keyword.json")
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
}
