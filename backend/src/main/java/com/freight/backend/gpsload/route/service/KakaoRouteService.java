package com.freight.backend.gpsload.route.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.freight.backend.gpsload.route.model.Place;
import com.freight.backend.gpsload.route.model.RouteRequest;
import com.freight.backend.gpsload.route.model.RouteResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.UriComponentsBuilder;

import java.util.List;
import java.util.stream.Collectors;

@Service
public class KakaoRouteService {

    private final RestTemplate restTemplate = new RestTemplate();
    private final ObjectMapper objectMapper = new ObjectMapper();

    @Value("${kakao.rest-api-key:}")
    private String kakaoRestApiKey;

    @Value("${kakao.mobility-base-url:}")
    private String kakaoMobilityBaseUrl;

    public RouteResponse findRoute(RouteRequest request) {
        return findRoute(request, false);
    }

    public RouteResponse findRoute(RouteRequest request, boolean useLiveTraffic) {
        validateConfig();
        Place origin = request.origin();
        Place destination = request.destination();
        List<Place> waypoints = request.waypoints();

        UriComponentsBuilder builder = UriComponentsBuilder
                .fromUriString(kakaoMobilityBaseUrl + "/v1/directions")
                .queryParam("origin", origin.longitude() + "," + origin.latitude())
                .queryParam("destination", destination.longitude() + "," + destination.latitude())
                .queryParam("priority", useLiveTraffic ? "TIME" : "RECOMMEND");

        if (waypoints != null && !waypoints.isEmpty()) {
            String wp = waypoints.stream()
                    .map(p -> p.longitude() + "," + p.latitude())
                    .collect(Collectors.joining("|"));
            builder.queryParam("waypoints", wp);
        }

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.set("Authorization", "KakaoAK " + kakaoRestApiKey);

        HttpEntity<Void> entity = new HttpEntity<>(headers);
        ResponseEntity<String> response = restTemplate.exchange(
                builder.build(true).toUri(),
                HttpMethod.GET,
                entity,
                String.class
        );

        try {
            JsonNode root = objectMapper.readTree(response.getBody());
            JsonNode routes = root.get("routes");
            if (routes == null || !routes.isArray() || routes.isEmpty()) {
                throw new IllegalStateException("No routes found");
            }
            JsonNode route = routes.get(0);
            JsonNode summary = route.get("summary");
            int distance = summary.get("distance").asInt();
            int duration = summary.get("duration").asInt();
            int segmentCount = route.get("sections").size();

            return new RouteResponse(distance, duration, segmentCount);
        } catch (Exception e) {
            throw new IllegalStateException("Failed to parse Kakao route", e);
        }
    }

    private void validateConfig() {
        if (kakaoRestApiKey == null || kakaoRestApiKey.isBlank()) {
            throw new IllegalStateException("KAKAO_REST_API_KEY is not configured");
        }
        if (kakaoMobilityBaseUrl == null || kakaoMobilityBaseUrl.isBlank()) {
            throw new IllegalStateException("kakao.mobility-base-url is not configured");
        }
    }
}
