package com.freight.backend.controller;

import com.freight.backend.dto.notification.NotificationResponse;
import com.freight.backend.dto.notification.UnreadCountResponse;
import com.freight.backend.entity.FcmToken;
import com.freight.backend.exception.CustomException;
import com.freight.backend.exception.ErrorCode;
import com.freight.backend.service.NotificationService;
import com.freight.backend.util.SecurityUtils;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.ArraySchema;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/notifications")
@RequiredArgsConstructor
@Tag(name = "Notification", description = "알림 관리 API")
public class NotificationController {

    private final NotificationService notificationService;

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
        if (SecurityUtils.isAdmin(userDetails)) {
            return FcmToken.UserType.ADMIN;
        }
        throw new CustomException(ErrorCode.AUTH_FORBIDDEN);
    }

    @Operation(summary = "내 알림 목록 조회")
    @ApiResponse(
            responseCode = "200",
            description = "알림 목록 반환",
            content = @Content(
                    mediaType = "application/json",
                    array = @ArraySchema(schema = @Schema(implementation = NotificationResponse.class))
            )
    )
    @GetMapping("/me")
    public ResponseEntity<List<NotificationResponse>> getMyNotifications(
            @AuthenticationPrincipal UserDetails userDetails
    ) {
        Long userId = requireUserId(userDetails);
        FcmToken.UserType userType = requireUserType(userDetails);
        return ResponseEntity.ok(notificationService.getMyNotifications(userType, userId));
    }

    @Operation(summary = "읽지 않은 알림 개수 조회")
    @ApiResponse(
            responseCode = "200",
            description = "읽지 않은 알림 개수 반환",
            content = @Content(
                    mediaType = "application/json",
                    schema = @Schema(implementation = UnreadCountResponse.class)
            )
    )
    @GetMapping("/me/unread-count")
    public ResponseEntity<UnreadCountResponse> getUnreadCount(
            @AuthenticationPrincipal UserDetails userDetails
    ) {
        Long userId = requireUserId(userDetails);
        FcmToken.UserType userType = requireUserType(userDetails);
        return ResponseEntity.ok(notificationService.getUnreadCount(userType, userId));
    }

    @Operation(summary = "알림 읽음 처리")
    @ApiResponse(responseCode = "204", description = "읽음 처리 완료")
    @PatchMapping("/{notificationId}/read")
    public ResponseEntity<Void> markRead(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable Long notificationId
    ) {
        Long userId = requireUserId(userDetails);
        FcmToken.UserType userType = requireUserType(userDetails);
        notificationService.markRead(userType, userId, notificationId);
        return ResponseEntity.noContent().build();
    }
}
