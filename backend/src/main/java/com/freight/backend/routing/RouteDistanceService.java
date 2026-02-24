package com.freight.backend.routing;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.freight.backend.exception.CustomException;
import com.freight.backend.exception.ErrorCode;
import java.io.IOException;
import java.util.ArrayList;
import java.util.List;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

@Service
public class RouteDistanceService {

    private static final int MAX_ATTEMPTS = 2;

    private final RestClient restClient;
    private final ObjectMapper objectMapper;
    private final boolean hasApiKey;

    public RouteDistanceService(
            RestClient.Builder restClientBuilder,
            @Value("${routing.kakao.base-url:https://apis-navi.kakaomobility.com}") String baseUrl,
            @Value("${routing.kakao.api-key:}") String apiKey,
            @Value("${routing.timeout-ms:3000}") int timeoutMs
    ) {
        this.objectMapper = new ObjectMapper();
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

    public int calculateDistanceKm(List<RoutePoint> points) {
        if (points == null || points.size() < 2) {
            throw new CustomException(ErrorCode.INVALID_REQUEST);
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

                long meters = parseDistanceMeters(response);
                int km = (int) Math.round(meters / 1000.0d);
                return Math.max(1, km);
            } catch (RuntimeException e) {
                lastException = e;
            }
        }

        if (lastException != null) {
            throw lastException;
        }
        throw new CustomException(ErrorCode.EXTERNAL_API_ERROR);
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
}
