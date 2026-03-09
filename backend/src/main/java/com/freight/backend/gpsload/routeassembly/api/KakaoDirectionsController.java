package com.freight.backend.gpsload.routeassembly.api;

import com.freight.backend.gpsload.route.model.Place;
import com.freight.backend.gpsload.route.service.CachedRouteService;
import com.freight.backend.gpsload.route.service.CachedRouteService.RouteDistance;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.RestTemplate;

import java.util.ArrayList;
import java.util.List;

/**
 * 카카오 모빌리티 API 프록시 컨트롤러
 *
 * 프론트엔드에서 직접 호출할 수 없는 카카오 API를 백엔드에서 프록시
 * https://developers.kakao.com/docs/latest/ko/kakaonavi/common
 */
@RestController
@RequestMapping("/api/route")
@CrossOrigin(origins = "*")
public class KakaoDirectionsController {

    @Value("${kakao.rest-api-key:}")
    private String kakaoRestApiKey;

    @Value("${kakao.mobility-base-url:}")
    private String kakaoMobilityBaseUrl;

    private final RestTemplate restTemplate;
    private final CachedRouteService cachedRouteService;

    public KakaoDirectionsController(
            CachedRouteService cachedRouteService,
            @Qualifier("externalApiRestTemplate") RestTemplate restTemplate
    ) {
        this.cachedRouteService = cachedRouteService;
        this.restTemplate = restTemplate;
    }

    /**
     * 카카오 모빌리티 길찾기 API 프록시
     * GET /api/route/directions?origin=127.0,37.5&destination=127.1,37.6
     *
     * @param origin 출발지 (경도,위도)
     * @param destination 도착지 (경도,위도)
     * @param waypoints 경유지 (경도,위도|경도,위도|...) - 선택
     * @return 카카오 API 응답 (JSON)
     */
    @GetMapping("/directions")
    public ResponseEntity<String> getDirections(
            @RequestParam String origin,
            @RequestParam String destination,
            @RequestParam(required = false) String waypoints) {

        if (kakaoRestApiKey == null || kakaoRestApiKey.isBlank() || kakaoMobilityBaseUrl == null || kakaoMobilityBaseUrl.isBlank()) {
            return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE)
                    .body("{\"error\": \"카카오 API 설정이 없습니다. application.yml의 kakao.rest-api-key, kakao.mobility-base-url를 확인하세요.\"}");
        }

        try {
            String base = kakaoMobilityBaseUrl.replaceAll("/$", "");
            String url = base + "/v1/directions?" +
                    "origin=" + origin +
                    "&destination=" + destination +
                    "&priority=RECOMMEND" +
                    "&car_fuel=GASOLINE" +
                    "&car_hipass=false" +
                    "&alternatives=false" +
                    "&road_details=false";

            if (waypoints != null && !waypoints.isEmpty()) {
                url += "&waypoints=" + waypoints;
            }

            HttpHeaders headers = new HttpHeaders();
            headers.set("Authorization", "KakaoAK " + kakaoRestApiKey);
            headers.setContentType(MediaType.APPLICATION_JSON);

            HttpEntity<String> entity = new HttpEntity<>(headers);

            // API 호출
            ResponseEntity<String> response = restTemplate.exchange(
                    url,
                    HttpMethod.GET,
                    entity,
                    String.class
            );

            return ResponseEntity.ok()
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(response.getBody());

        } catch (Exception e) {
            // 오류 발생 시 폴백 응답
            return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE)
                    .body("{\"error\": \"" + e.getMessage() + "\", \"message\": \"카카오 API 호출 실패\"}");
        }
    }

    /**
     * 다중 경유지 경로 계산
     * POST /api/route/multi-directions
     *
     * @param request 경유지 목록 JSON
     * @return 전체 경로 정보
     */
    @PostMapping("/multi-directions")
    public ResponseEntity<String> getMultiDirections(@RequestBody MultiDirectionsRequest request) {
        try {
            if (request.waypoints == null || request.waypoints.length < 2) {
                return ResponseEntity.badRequest()
                        .body("{\"error\": \"최소 2개 이상의 경유지가 필요합니다\"}");
            }

            StringBuilder result = new StringBuilder("{\"routes\": [");
            double totalDistance = 0;
            double totalDuration = 0;

            // 각 구간별 경로 계산
            for (int i = 0; i < request.waypoints.length - 1; i++) {
                String origin = request.waypoints[i].lng + "," + request.waypoints[i].lat;
                String destination = request.waypoints[i + 1].lng + "," + request.waypoints[i + 1].lat;

                ResponseEntity<String> segmentResponse = getDirections(origin, destination, null);

                if (i > 0) result.append(",");
                result.append(segmentResponse.getBody());

                // 거리/시간 파싱 (간단한 구현)
                // 실제로는 JSON 파서 사용 권장
                String body = segmentResponse.getBody();
                if (body != null && body.contains("\"distance\":")) {
                    // 간단한 파싱 (production에서는 Jackson 사용)
                    try {
                        int distIdx = body.indexOf("\"distance\":") + 11;
                        int distEnd = body.indexOf(",", distIdx);
                        totalDistance += Double.parseDouble(body.substring(distIdx, distEnd));

                        int durIdx = body.indexOf("\"duration\":") + 11;
                        int durEnd = body.indexOf(",", durIdx);
                        if (durEnd == -1) durEnd = body.indexOf("}", durIdx);
                        totalDuration += Double.parseDouble(body.substring(durIdx, durEnd));
                    } catch (Exception e) {
                        // 파싱 실패 시 무시
                    }
                }
            }

            result.append("], \"summary\": {");
            result.append("\"totalDistance\": ").append(totalDistance).append(",");
            result.append("\"totalDuration\": ").append(totalDuration);
            result.append("}}");

            return ResponseEntity.ok()
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(result.toString());

        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE)
                    .body("{\"error\": \"" + e.getMessage() + "\"}");
        }
    }

    /**
     * 캐시된 거리 조회 (단일)
     * GET /api/route/cached-distance?fromLat=37.5&fromLng=127.0&toLat=37.6&toLng=127.1
     *
     * @return 캐시된 거리/시간 (없으면 API 호출 후 캐싱)
     */
    @GetMapping("/cached-distance")
    public ResponseEntity<CachedDistanceResponse> getCachedDistance(
            @RequestParam double fromLat,
            @RequestParam double fromLng,
            @RequestParam double toLat,
            @RequestParam double toLng) {
        try {
            Place from = new Place(null, null, fromLat, fromLng);
            Place to = new Place(null, null, toLat, toLng);
            RouteDistance distance = cachedRouteService.getDistance(from, to);

            return ResponseEntity.ok(new CachedDistanceResponse(
                    distance.distanceM(),
                    distance.durationS(),
                    distance.isEstimate(),
                    null
            ));
        } catch (Exception e) {
            return ResponseEntity.ok(new CachedDistanceResponse(
                    0, 0, true, e.getMessage()
            ));
        }
    }

    /**
     * 캐시된 거리 일괄 조회 (배치)
     * POST /api/route/cached-distances
     *
     * 여러 구간의 거리를 한 번에 조회하여 API 호출 횟수 최소화
     */
    @PostMapping("/cached-distances")
    public ResponseEntity<BatchDistanceResponse> getCachedDistances(
            @RequestBody BatchDistanceRequest request) {
        try {
            List<CachedDistanceResponse> results = new ArrayList<>();

            for (DistancePair pair : request.pairs) {
                Place from = new Place(null, null, pair.fromLat, pair.fromLng);
                Place to = new Place(null, null, pair.toLat, pair.toLng);
                RouteDistance distance = cachedRouteService.getDistance(from, to);

                results.add(new CachedDistanceResponse(
                        distance.distanceM(),
                        distance.durationS(),
                        distance.isEstimate(),
                        null
                ));
            }

            return ResponseEntity.ok(new BatchDistanceResponse(results, null));
        } catch (Exception e) {
            return ResponseEntity.ok(new BatchDistanceResponse(
                    List.of(), e.getMessage()
            ));
        }
    }

    /**
     * API 상태 체크
     */
    @GetMapping("/health")
    public ResponseEntity<String> health() {
        return ResponseEntity.ok("{\"status\": \"ok\", \"service\": \"Kakao Directions Proxy\"}");
    }

    // 요청/응답 DTO
    public static class MultiDirectionsRequest {
        public Waypoint[] waypoints;
    }

    public static class Waypoint {
        public double lat;
        public double lng;
    }

    public static class BatchDistanceRequest {
        public List<DistancePair> pairs;
    }

    public static class DistancePair {
        public double fromLat;
        public double fromLng;
        public double toLat;
        public double toLng;
    }

    public record CachedDistanceResponse(
            int distanceM,
            int durationS,
            boolean isEstimate,
            String error
    ) {}

    public record BatchDistanceResponse(
            List<CachedDistanceResponse> distances,
            String error
    ) {}
}
