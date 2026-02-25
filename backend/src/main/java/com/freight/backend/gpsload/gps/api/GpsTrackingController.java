package com.freight.backend.gpsload.gps.api;

import com.freight.backend.gpsload.gps.entity.GpsLog;
import com.freight.backend.gpsload.gps.model.GpsLogRequest;
import com.freight.backend.gpsload.gps.model.TrackingResponse;
import com.freight.backend.gpsload.gps.model.TrackingResponse.RoutePoint;
import com.freight.backend.gpsload.gps.service.GpsTrackingService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/gpsmiss-legacy")
@ConditionalOnProperty(
        name = "gpsmiss.legacy-api.enabled",
        havingValue = "true",
        matchIfMissing = false
)
public class GpsTrackingController {

    private static final Logger log = LoggerFactory.getLogger(GpsTrackingController.class);

    private final GpsTrackingService gpsTrackingService;

    public GpsTrackingController(GpsTrackingService gpsTrackingService) {
        this.gpsTrackingService = gpsTrackingService;
    }

    @PostMapping("/driver/matches/{matchId}/gps")
    public ResponseEntity<?> submitGpsLocation(
            @PathVariable Long matchId,
            @RequestBody GpsLogRequest request
    ) {
        if (!request.isValid()) {
            return ResponseEntity.badRequest().body(
                    Map.of("error", "Invalid GPS coordinate.")
            );
        }

        try {
            // TODO: Resolve real driverId from JWT and validate ownership.
            Long driverId = 0L;

            GpsLog savedLog = gpsTrackingService.receiveGpsLog(matchId, driverId, request);

            return ResponseEntity.ok(Map.of(
                    "gpsLogId", savedLog.getGpsLogId(),
                    "matchId", matchId,
                    "loggedAt", savedLog.getLoggedAt().toString()
            ));
        } catch (Exception e) {
            log.error("GPS submit failed (matchId={}): {}", matchId, e.getMessage(), e);
            return ResponseEntity.internalServerError().body(
                    Map.of("error", "Failed to save GPS location: " + e.getMessage())
            );
        }
    }

    @GetMapping("/shipper/matches/{matchId}/tracking")
    public ResponseEntity<?> getTrackingInfo(@PathVariable Long matchId) {
        try {
            // TODO: Read planned route and status from real tables.
            List<RoutePoint> route = List.of();
            String matchStatus = "IN_TRANSIT";

            TrackingResponse tracking = gpsTrackingService.getTrackingInfo(
                    matchId, route, matchStatus
            );

            return ResponseEntity.ok(tracking);
        } catch (Exception e) {
            log.error("Tracking lookup failed (matchId={}): {}", matchId, e.getMessage(), e);
            return ResponseEntity.internalServerError().body(
                    Map.of("error", "Failed to read tracking info: " + e.getMessage())
            );
        }
    }

    @GetMapping("/matches/{matchId}/gps/history")
    public ResponseEntity<?> getGpsHistory(
            @PathVariable Long matchId,
            @RequestParam(defaultValue = "100") int limit,
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime since
    ) {
        try {
            List<GpsLog> history = gpsTrackingService.getGpsHistory(matchId, limit, since);

            List<Map<String, Object>> response = history.stream()
                    .map(gl -> Map.<String, Object>of(
                            "gpsLogId", gl.getGpsLogId(),
                            "lat", gl.getLat(),
                            "lng", gl.getLng(),
                            "speedKmh", gl.getSpeedKmh() != null ? gl.getSpeedKmh() : 0,
                            "bearing", gl.getBearing() != null ? gl.getBearing() : 0,
                            "loggedAt", gl.getLoggedAt().toString()
                    ))
                    .toList();

            return ResponseEntity.ok(Map.of(
                    "matchId", matchId,
                    "count", response.size(),
                    "logs", response
            ));
        } catch (Exception e) {
            log.error("GPS history failed (matchId={}): {}", matchId, e.getMessage(), e);
            return ResponseEntity.internalServerError().body(
                    Map.of("error", "Failed to read GPS history: " + e.getMessage())
            );
        }
    }
}
