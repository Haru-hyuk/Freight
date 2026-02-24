package com.freight.backend.controller;

import com.freight.backend.dto.admin.AdminSanctionCreateRequest;
import com.freight.backend.exception.CustomException;
import com.freight.backend.exception.ErrorCode;
import com.freight.backend.service.AdminSanctionService;
import java.util.List;
import java.util.Map;
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
@RequestMapping("/api/admin/sanctions")
public class AdminSanctionController {

    private final AdminSanctionService adminSanctionService;

    @GetMapping
    public ResponseEntity<List<Map<String, Object>>> list(
            @AuthenticationPrincipal UserDetails userDetails
    ) {
        requireAdmin(userDetails);
        return ResponseEntity.ok(adminSanctionService.listSanctions());
    }

    @PostMapping
    public ResponseEntity<Map<String, Object>> create(
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestBody AdminSanctionCreateRequest request
    ) {
        requireAdmin(userDetails);
        Long adminId = Long.parseLong(userDetails.getUsername());
        return ResponseEntity.ok(adminSanctionService.createSanction(adminId, request));
    }

    @PatchMapping("/{sanctionId}/release")
    public ResponseEntity<Map<String, Object>> release(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable Long sanctionId
    ) {
        requireAdmin(userDetails);
        return ResponseEntity.ok(adminSanctionService.releaseSanction(sanctionId));
    }

    private static void requireAdmin(UserDetails userDetails) {
        if (userDetails == null || !userDetails.getAuthorities().contains(new SimpleGrantedAuthority("ROLE_ADMIN"))) {
            throw new CustomException(ErrorCode.AUTH_FORBIDDEN);
        }
    }
}
