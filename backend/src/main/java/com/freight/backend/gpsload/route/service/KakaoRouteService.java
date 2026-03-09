package com.freight.backend.gpsload.route.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.freight.backend.gpsload.route.model.Place;
import com.freight.backend.gpsload.route.model.RouteRequest;
import com.freight.backend.gpsload.route.model.RouteResponse;
import org.springframework.beans.factory.annotation.Qualifier;
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

    private final RestTemplate restTemplate;
    private final ObjectMapper objectMapper = new ObjectMapper();

    @Value("${routing.kakao.api-key:${kakao.rest-api-key:}}")
    private String kakaoRestApiKey;

    @Value("${routing.kakao.base-url:${kakao.mobility-base-url:}}")
    private String kakaoMobilityBaseUrl;

    public KakaoRouteService(@Qualifier("externalApiRestTemplate") RestTemplate restTemplate) {
        this.restTemplate = restTemplate;
    }

    public RouteResponse findRoute(RouteRequest request) {
        return findRoute(request, false);
    }

    public RouteResponse findRoute(RouteRequest request, boolean useLiveTraffic) {
        validateConfig();
        Place origin = request.origin();
        Place destination = request.destination();
        List<Place> waypoints = request.waypoints();

        validatePlace(origin, "origin");
        validatePlace(destination, "destination");

        UriComponentsBuilder builder = UriComponentsBuilder
                .fromUriString(kakaoMobilityBaseUrl + "/v1/directions")
                .queryParam("origin", origin.longitude() + "," + origin.latitude())
                .queryParam("destination", destination.longitude() + "," + destination.latitude())
                .queryParam("priority", useLiveTraffic ? "TIME" : "RECOMMEND")
                .queryParam("car_fuel", "GASOLINE")
                .queryParam("car_hipass", false)
                .queryParam("alternatives", false)
                .queryParam("road_details", false);

        if (waypoints != null && !waypoints.isEmpty()) {
            String wp = waypoints.stream()
                    .peek(place -> validatePlace(place, "waypoint"))
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
            if (!response.getStatusCode().is2xxSuccessful()) {
                throw new IllegalStateException("Kakao route api returned non-2xx: " + response.getStatusCode());
            }
            String body = response.getBody();
            if (body == null || body.isBlank()) {
                throw new IllegalStateException("Kakao route api response body is empty");
            }

            JsonNode root = objectMapper.readTree(body);
            JsonNode routes = root.get("routes");
            if (routes == null || !routes.isArray() || routes.isEmpty()) {
                throw new IllegalStateException("No routes found");
            }
            JsonNode route = routes.get(0);
            JsonNode summary = route.path("summary");
            if (summary.isMissingNode() || summary.isNull()) {
                JsonNode errorCode = root.path("code");
                JsonNode errorMessage = root.path("message");
                if (!errorCode.isMissingNode() || !errorMessage.isMissingNode()) {
                    throw new IllegalStateException("Kakao route api error: code=" + errorCode.asText("") + ", message=" + errorMessage.asText(""));
                }
                throw new IllegalStateException("Kakao route summary is missing");
            }
            int distance = readPositiveInt(summary, "distance");
            int duration = readPositiveInt(summary, "duration");
            if (distance < 0 || duration < 0) {
                throw new IllegalStateException("Kakao route summary fields are missing");
            }
            JsonNode sections = route.path("sections");
            int segmentCount = sections.isArray() && !sections.isEmpty() ? sections.size() : 1;

            return new RouteResponse(distance, duration, segmentCount);
        } catch (Exception e) {
            String snippet = response.getBody();
            if (snippet != null && snippet.length() > 400) {
                snippet = snippet.substring(0, 400);
            }
            throw new IllegalStateException("Failed to parse Kakao route. body=" + snippet, e);
        }
    }

    private int readPositiveInt(JsonNode node, String field) {
        JsonNode valueNode = node.path(field);
        if (valueNode.isNumber()) {
            return valueNode.asInt(-1);
        }
        if (valueNode.isTextual()) {
            try {
                return Integer.parseInt(valueNode.asText().trim());
            } catch (NumberFormatException ignored) {
                return -1;
            }
        }
        return -1;
    }

    private void validatePlace(Place place, String label) {
        if (place == null
                || place.latitude() == null
                || place.longitude() == null
                || !Double.isFinite(place.latitude())
                || !Double.isFinite(place.longitude())
                || place.latitude() == 0.0
                || place.longitude() == 0.0
                || place.latitude() < -90.0
                || place.latitude() > 90.0
                || place.longitude() < -180.0
                || place.longitude() > 180.0) {
            throw new IllegalStateException("Invalid Kakao route " + label + " coordinates");
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
