package com.freight.backend.gpsload.gps.api;

import com.freight.backend.exception.CustomException;
import com.freight.backend.exception.ErrorCode;
import com.freight.backend.gpsload.gps.model.GpsLogRequest;
import com.freight.backend.gpsload.gps.model.TrackingResponse;
import com.freight.backend.gpsload.gps.model.TrackingResponse.RoutePoint;
import com.freight.backend.gpsload.tracking.dto.GpsLogUpsertRequest;
import com.freight.backend.gpsload.tracking.dto.GpsLogUpsertResponse;
import com.freight.backend.gpsload.tracking.entity.GpsLog;
import com.freight.backend.gpsload.tracking.service.TrackingService;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

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

    private final TrackingService trackingService;

    public GpsTrackingController(TrackingService trackingService) {
        this.trackingService = trackingService;
    }

    @PostMapping("/driver/matches/{matchId}/gps")
    public ResponseEntity<?> submitGpsLocation(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable Long matchId,
            @RequestBody GpsLogRequest request
    ) {
        if (!request.isValid()) {
            return ResponseEntity.badRequest().body(
                    Map.of("error", "Invalid GPS coordinate.")
            );
        }

        Long driverId = requireRoleUserId(userDetails, "ROLE_DRIVER");

        GpsLogUpsertRequest upsert = new GpsLogUpsertRequest();
        upsert.setLat(request.lat());
        upsert.setLng(request.lng());
        upsert.setSpeedKmh(request.speedKmh());
        upsert.setBearing(request.bearing());

        GpsLogUpsertResponse saved = trackingService.upsertDriverLocation(driverId, matchId, upsert);

        return ResponseEntity.ok(Map.of(
                "gpsLogId", saved.getGpsLogId(),
                "matchId", saved.getMatchId(),
                "loggedAt", saved.getLoggedAt().toString()
        ));
    }

    @GetMapping("/shipper/matches/{matchId}/tracking")
    public ResponseEntity<?> getTrackingInfo(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable Long matchId
    ) {
        Long shipperId = requireRoleUserId(userDetails, "ROLE_SHIPPER");
        com.freight.backend.gpsload.tracking.dto.TrackingResponse tracking =
                trackingService.getShipperTracking(shipperId, matchId);

        TrackingResponse.DriverLocation currentLocation = null;
        if (tracking.getCurrentLocation() != null) {
            currentLocation = new TrackingResponse.DriverLocation(
                    tracking.getCurrentLocation().getLat(),
                    tracking.getCurrentLocation().getLng(),
                    tracking.getCurrentLocation().getSpeedKmh(),
                    tracking.getCurrentLocation().getBearing(),
                    Boolean.FALSE,
                    null,
                    tracking.getCurrentLocation().getLoggedAt()
            );
        }

        return ResponseEntity.ok(new TrackingResponse(
                currentLocation,
                List.<RoutePoint>of(),
                List.of(),
                tracking.getMatchStatus()
        ));
    }

    @GetMapping("/matches/{matchId}/gps/history")
    public ResponseEntity<?> getGpsHistory(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable Long matchId,
            @RequestParam(defaultValue = "100") int limit,
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime since
    ) {
        List<GpsLog> history;
        if (hasRole(userDetails, "ROLE_DRIVER")) {
            Long driverId = requireRoleUserId(userDetails, "ROLE_DRIVER");
            history = trackingService.getGpsHistoryForDriver(driverId, matchId, limit, since);
        } else if (hasRole(userDetails, "ROLE_SHIPPER")) {
            Long shipperId = requireRoleUserId(userDetails, "ROLE_SHIPPER");
            history = trackingService.getGpsHistoryForShipper(shipperId, matchId, since, limit);
        } else {
            throw new CustomException(ErrorCode.AUTH_FORBIDDEN);
        }

        List<Map<String, Object>> response = history.stream()
                .map(gl -> Map.<String, Object>of(
                        "gpsLogId", gl.getGpsLogId(),
                        "lat", gl.getLat().doubleValue(),
                        "lng", gl.getLng().doubleValue(),
                        "speedKmh", gl.getSpeedKmh() != null ? gl.getSpeedKmh().doubleValue() : 0D,
                        "bearing", gl.getBearing() != null ? gl.getBearing().doubleValue() : 0D,
                        "loggedAt", gl.getLoggedAt().toString()
                ))
                .toList();

        return ResponseEntity.ok(Map.of(
                "matchId", matchId,
                "count", response.size(),
                "logs", response
        ));
    }

    private static boolean hasRole(UserDetails userDetails, String role) {
        return userDetails != null
                && userDetails.getAuthorities().contains(new SimpleGrantedAuthority(role));
    }

    private static Long requireRoleUserId(UserDetails userDetails, String role) {
        if (!hasRole(userDetails, role)) {
            throw new CustomException(ErrorCode.AUTH_FORBIDDEN);
        }
        try {
            return Long.parseLong(userDetails.getUsername());
        } catch (NumberFormatException e) {
            throw new CustomException(ErrorCode.AUTH_UNAUTHORIZED);
        }
    }
}
