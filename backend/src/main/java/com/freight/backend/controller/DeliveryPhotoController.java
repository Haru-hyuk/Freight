package com.freight.backend.controller;

import com.freight.backend.dto.delivery.DeliveryPhotoResponse;
import com.freight.backend.entity.DeliveryPhoto;
import com.freight.backend.exception.CustomException;
import com.freight.backend.exception.ErrorCode;
import com.freight.backend.service.DeliveryPhotoService;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.Resource;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class DeliveryPhotoController {

    private final DeliveryPhotoService deliveryPhotoService;

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

    private static String resolveRole(UserDetails userDetails) {
        if (userDetails == null) {
            throw new CustomException(ErrorCode.AUTH_FORBIDDEN);
        }
        if (userDetails.getAuthorities().contains(new SimpleGrantedAuthority("ROLE_DRIVER"))) {
            return "ROLE_DRIVER";
        }
        if (userDetails.getAuthorities().contains(new SimpleGrantedAuthority("ROLE_SHIPPER"))) {
            return "ROLE_SHIPPER";
        }
        throw new CustomException(ErrorCode.AUTH_FORBIDDEN);
    }

    @PostMapping(
            value = "/driver/matches/{matchId}/photos",
            consumes = MediaType.MULTIPART_FORM_DATA_VALUE
    )
    public ResponseEntity<DeliveryPhotoResponse> uploadDriverPhoto(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable Long matchId,
            @RequestParam("type") DeliveryPhoto.Type type,
            @RequestParam("file") MultipartFile file,
            @RequestParam(value = "takenAt", required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime takenAt,
            @RequestParam(value = "lat", required = false) BigDecimal lat,
            @RequestParam(value = "lng", required = false) BigDecimal lng,
            @RequestParam(value = "stopOrder", required = false) Integer stopOrder,
            @RequestParam(value = "stopLabel", required = false) String stopLabel
    ) {
        Long driverId = requireDriverId(userDetails);
        DeliveryPhotoResponse response = deliveryPhotoService.uploadByDriver(
                driverId,
                matchId,
                type,
                file,
                takenAt,
                lat,
                lng,
                stopOrder,
                stopLabel
        );
        return ResponseEntity.ok(response);
    }

    @GetMapping("/driver/matches/{matchId}/photos")
    public ResponseEntity<List<DeliveryPhotoResponse>> getDriverMatchPhotos(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable Long matchId
    ) {
        Long driverId = requireDriverId(userDetails);
        return ResponseEntity.ok(deliveryPhotoService.listForDriver(driverId, matchId));
    }

    @GetMapping("/shipper/matches/{matchId}/photos")
    public ResponseEntity<List<DeliveryPhotoResponse>> getShipperMatchPhotos(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable Long matchId
    ) {
        Long shipperId = requireShipperId(userDetails);
        return ResponseEntity.ok(deliveryPhotoService.listForShipper(shipperId, matchId));
    }

    @GetMapping("/delivery-photos/{photoId}/file")
    public ResponseEntity<Resource> downloadPhoto(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable Long photoId
    ) {
        if (userDetails == null) {
            throw new CustomException(ErrorCode.AUTH_FORBIDDEN);
        }
        Long userId = Long.parseLong(userDetails.getUsername());
        String role = resolveRole(userDetails);
        return deliveryPhotoService.download(photoId, userId, role);
    }
}

