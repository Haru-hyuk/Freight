package com.freight.backend.controller;

import com.freight.backend.dto.admin.AdminUserStatusUpdateRequest;
import com.freight.backend.exception.CustomException;
import com.freight.backend.exception.ErrorCode;
import com.freight.backend.service.AdminOpsService;
import com.freight.backend.util.SecurityUtils;
import java.util.Map;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/admin")
public class AdminOpsController {

    private final AdminOpsService adminOpsService;

    @GetMapping("/dashboard")
    public ResponseEntity<Map<String, Object>> dashboard(
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestParam(name = "range", required = false, defaultValue = "7d") String range
    ) {
        requireAdmin(userDetails);
        return ResponseEntity.ok(adminOpsService.getDashboard(range));
    }

    @GetMapping("/users")
    public ResponseEntity<Map<String, Object>> users(
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestParam(name = "role", required = false) String role,
            @RequestParam(name = "status", required = false) String status,
            @RequestParam(name = "q", required = false) String q,
            @RequestParam(name = "page", required = false) Integer page,
            @RequestParam(name = "size", required = false) Integer size
    ) {
        requireAdmin(userDetails);
        return ResponseEntity.ok(adminOpsService.getUsers(role, status, q, page, size));
    }

    @GetMapping("/users/{userId}")
    public ResponseEntity<Map<String, Object>> userDetail(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable String userId
    ) {
        requireAdmin(userDetails);
        return ResponseEntity.ok(adminOpsService.getUserDetail(userId));
    }

    @PatchMapping("/users/{userId}/status")
    public ResponseEntity<Map<String, Object>> updateUserStatus(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable String userId,
            @Valid @RequestBody AdminUserStatusUpdateRequest request
    ) {
        requireAdmin(userDetails);
        return ResponseEntity.ok(adminOpsService.updateUserStatus(userId, request.getStatus()));
    }

    private static void requireAdmin(UserDetails userDetails) {
        if (userDetails == null || !SecurityUtils.isAdmin(userDetails)) {
            throw new CustomException(ErrorCode.AUTH_FORBIDDEN);
        }
    }
}
