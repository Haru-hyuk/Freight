package com.freight.backend.controller;

import com.freight.backend.dto.notification.FcmTokenUpsertRequest;
import com.freight.backend.entity.FcmToken;
import com.freight.backend.exception.CustomException;
import com.freight.backend.exception.ErrorCode;
import com.freight.backend.service.FcmService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/push-tokens")
@RequiredArgsConstructor
public class FcmTokenController {

    private final FcmService fcmService;

    private static Long requireUserId(UserDetails userDetails) {
        if (userDetails == null) {
            throw new CustomException(ErrorCode.AUTH_FORBIDDEN);
        }
        return Long.parseLong(userDetails.getUsername());
    }

    private static FcmToken.UserType requireUserType(UserDetails userDetails) {
        if (userDetails == null) {
            throw new CustomException(ErrorCode.AUTH_FORBIDDEN);
        }
        if (userDetails.getAuthorities().contains(new SimpleGrantedAuthority("ROLE_DRIVER"))) {
            return FcmToken.UserType.DRIVER;
        }
        if (userDetails.getAuthorities().contains(new SimpleGrantedAuthority("ROLE_SHIPPER"))) {
            return FcmToken.UserType.SHIPPER;
        }
        if (userDetails.getAuthorities().contains(new SimpleGrantedAuthority("ROLE_ADMIN"))) {
            return FcmToken.UserType.ADMIN;
        }
        throw new CustomException(ErrorCode.AUTH_FORBIDDEN);
    }

    @PostMapping("/me")
    public ResponseEntity<Void> upsertMyToken(
            @AuthenticationPrincipal UserDetails userDetails,
            @Valid @RequestBody FcmTokenUpsertRequest request
    ) {
        Long userId = requireUserId(userDetails);
        FcmToken.UserType userType = requireUserType(userDetails);
        fcmService.upsertToken(userType, userId, request.getDeviceType(), request.getFcmToken());
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/me")
    public ResponseEntity<Void> deactivateMyToken(
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestParam("fcmToken") String fcmToken
    ) {
        Long userId = requireUserId(userDetails);
        FcmToken.UserType userType = requireUserType(userDetails);
        fcmService.deactivateToken(userType, userId, fcmToken);
        return ResponseEntity.noContent().build();
    }
}
