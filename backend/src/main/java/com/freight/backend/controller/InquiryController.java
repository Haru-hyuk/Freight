package com.freight.backend.controller;

import com.freight.backend.dto.inquiry.InquiryAnswerRequest;
import com.freight.backend.dto.inquiry.InquiryCreateRequest;
import com.freight.backend.dto.inquiry.InquiryResponse;
import com.freight.backend.exception.CustomException;
import com.freight.backend.exception.ErrorCode;
import com.freight.backend.service.InquiryService;
import jakarta.validation.Valid;
import java.util.List;
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
public class InquiryController {

    private final InquiryService inquiryService;

    @PostMapping("/shipper/inquiries")
    public ResponseEntity<InquiryResponse> create(
            @AuthenticationPrincipal UserDetails userDetails,
            @Valid @RequestBody InquiryCreateRequest request
    ) {
        Long shipperId = requireShipperId(userDetails);
        return ResponseEntity.ok(inquiryService.createByShipper(shipperId, request));
    }

    @GetMapping("/shipper/inquiries/me")
    public ResponseEntity<List<InquiryResponse>> myInquiries(
            @AuthenticationPrincipal UserDetails userDetails
    ) {
        Long shipperId = requireShipperId(userDetails);
        return ResponseEntity.ok(inquiryService.getMyInquiries(shipperId));
    }

    @PostMapping("/driver/inquiries")
    public ResponseEntity<InquiryResponse> createByDriver(
            @AuthenticationPrincipal UserDetails userDetails,
            @Valid @RequestBody InquiryCreateRequest request
    ) {
        Long driverId = requireDriverId(userDetails);
        return ResponseEntity.ok(inquiryService.createByDriver(driverId, request));
    }

    @GetMapping("/driver/inquiries/me")
    public ResponseEntity<List<InquiryResponse>> myDriverInquiries(
            @AuthenticationPrincipal UserDetails userDetails
    ) {
        Long driverId = requireDriverId(userDetails);
        return ResponseEntity.ok(inquiryService.getDriverInquiries(driverId));
    }

    @GetMapping("/admin/inquiries")
    public ResponseEntity<List<InquiryResponse>> allInquiries(
            @AuthenticationPrincipal UserDetails userDetails
    ) {
        requireAdminId(userDetails);
        return ResponseEntity.ok(inquiryService.getAllForAdmin());
    }

    @PatchMapping("/admin/inquiries/{inquiryId}/answer")
    public ResponseEntity<InquiryResponse> answer(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable Long inquiryId,
            @Valid @RequestBody InquiryAnswerRequest request
    ) {
        Long adminId = requireAdminId(userDetails);
        return ResponseEntity.ok(inquiryService.answerByAdmin(adminId, inquiryId, request));
    }

    private static Long requireShipperId(UserDetails userDetails) {
        if (userDetails == null || !userDetails.getAuthorities().contains(new SimpleGrantedAuthority("ROLE_SHIPPER"))) {
            throw new CustomException(ErrorCode.AUTH_FORBIDDEN);
        }
        return Long.parseLong(userDetails.getUsername());
    }

    private static Long requireAdminId(UserDetails userDetails) {
        if (userDetails == null || !userDetails.getAuthorities().contains(new SimpleGrantedAuthority("ROLE_ADMIN"))) {
            throw new CustomException(ErrorCode.AUTH_FORBIDDEN);
        }
        return Long.parseLong(userDetails.getUsername());
    }

    private static Long requireDriverId(UserDetails userDetails) {
        if (userDetails == null || !userDetails.getAuthorities().contains(new SimpleGrantedAuthority("ROLE_DRIVER"))) {
            throw new CustomException(ErrorCode.AUTH_FORBIDDEN);
        }
        return Long.parseLong(userDetails.getUsername());
    }
}
