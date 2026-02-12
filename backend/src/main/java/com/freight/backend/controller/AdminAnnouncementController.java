package com.freight.backend.controller;

import com.freight.backend.dto.announcement.AnnouncementCreateRequest;
import com.freight.backend.dto.announcement.AnnouncementResponse;
import com.freight.backend.dto.announcement.AnnouncementUpdateRequest;
import com.freight.backend.exception.CustomException;
import com.freight.backend.exception.ErrorCode;
import com.freight.backend.service.AnnouncementService;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/admin/announcements")
@RequiredArgsConstructor
public class AdminAnnouncementController {

    private final AnnouncementService announcementService;

    private static Long requireAdminId(UserDetails userDetails) {
        if (userDetails == null) {
            throw new CustomException(ErrorCode.AUTH_FORBIDDEN);
        }
        boolean isAdmin = userDetails.getAuthorities().stream()
                .map(GrantedAuthority::getAuthority)
                .anyMatch(auth -> auth.equals("ROLE_ADMIN")
                        || auth.equals("ROLE_SUPER")
                        || auth.equals("ROLE_OPERATOR")
                        || auth.equals("ROLE_CS"));
        if (!isAdmin) {
            throw new CustomException(ErrorCode.AUTH_FORBIDDEN);
        }
        return Long.parseLong(userDetails.getUsername());
    }

    @PostMapping
    public ResponseEntity<AnnouncementResponse> create(
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestBody AnnouncementCreateRequest request
    ) {
        Long adminId = requireAdminId(userDetails);
        return ResponseEntity.ok(announcementService.create(adminId, request));
    }

    @PutMapping("/{announcementId}")
    public ResponseEntity<AnnouncementResponse> update(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable Long announcementId,
            @RequestBody AnnouncementUpdateRequest request
    ) {
        requireAdminId(userDetails);
        return ResponseEntity.ok(announcementService.update(announcementId, request));
    }

    @DeleteMapping("/{announcementId}")
    public ResponseEntity<Void> delete(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable Long announcementId
    ) {
        requireAdminId(userDetails);
        announcementService.delete(announcementId);
        return ResponseEntity.noContent().build();
    }

    @GetMapping
    public ResponseEntity<List<AnnouncementResponse>> listAll(
            @AuthenticationPrincipal UserDetails userDetails
    ) {
        requireAdminId(userDetails);
        return ResponseEntity.ok(announcementService.listAll());
    }

    @GetMapping("/{announcementId}")
    public ResponseEntity<AnnouncementResponse> get(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable Long announcementId
    ) {
        requireAdminId(userDetails);
        return ResponseEntity.ok(announcementService.get(announcementId));
    }
}
