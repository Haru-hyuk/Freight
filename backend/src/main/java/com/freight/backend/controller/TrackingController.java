package com.freight.backend.controller;

import com.freight.backend.dto.tracking.GpsLogUpsertRequest;
import com.freight.backend.dto.tracking.GpsLogUpsertResponse;
import com.freight.backend.dto.tracking.TrackingResponse;
import com.freight.backend.dto.tracking.TrackingShareStateResponse;
import com.freight.backend.dto.tracking.TrackingShareUpdateRequest;
import com.freight.backend.exception.CustomException;
import com.freight.backend.exception.ErrorCode;
import com.freight.backend.service.TrackingService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api")
public class TrackingController {

    private final TrackingService trackingService;

    @PostMapping("/driver/matches/{matchId}/gps")
    public ResponseEntity<GpsLogUpsertResponse> submitDriverGps(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable Long matchId,
            @Valid @RequestBody GpsLogUpsertRequest request
    ) {
        Long driverId = requireDriverId(userDetails);
        return ResponseEntity.ok(trackingService.upsertDriverLocation(driverId, matchId, request));
    }

    @PatchMapping("/driver/matches/{matchId}/tracking-sharing")
    public ResponseEntity<TrackingShareStateResponse> updateTrackingSharing(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable Long matchId,
            @Valid @RequestBody TrackingShareUpdateRequest request
    ) {
        Long driverId = requireDriverId(userDetails);
        return ResponseEntity.ok(trackingService.updateTrackingSharing(driverId, matchId, request.getEnabled()));
    }

    @GetMapping("/shipper/matches/{matchId}/tracking")
    public ResponseEntity<TrackingResponse> getShipperTracking(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable Long matchId
    ) {
        Long shipperId = requireShipperId(userDetails);
        return ResponseEntity.ok(trackingService.getShipperTracking(shipperId, matchId));
    }

    private static Long requireDriverId(UserDetails userDetails) {
        if (userDetails == null || !userDetails.getAuthorities().contains(new SimpleGrantedAuthority("ROLE_DRIVER"))) {
            throw new CustomException(ErrorCode.AUTH_FORBIDDEN);
        }
        return Long.parseLong(userDetails.getUsername());
    }

    private static Long requireShipperId(UserDetails userDetails) {
        if (userDetails == null || !userDetails.getAuthorities().contains(new SimpleGrantedAuthority("ROLE_SHIPPER"))) {
            throw new CustomException(ErrorCode.AUTH_FORBIDDEN);
        }
        return Long.parseLong(userDetails.getUsername());
    }
}
