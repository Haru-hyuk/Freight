package com.freight.backend.controller;

import com.freight.backend.dto.inquiry.InquiryAnswerRequest;
import com.freight.backend.dto.inquiry.InquiryCreateRequest;
import com.freight.backend.dto.inquiry.InquiryResponse;
import com.freight.backend.exception.CustomException;
import com.freight.backend.exception.ErrorCode;
import com.freight.backend.service.InquiryService;
import com.freight.backend.util.SecurityUtils;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.ArraySchema;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
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
@Tag(name = "Inquiry", description = "문의 API")
public class InquiryController {

    private final InquiryService inquiryService;

    @Operation(summary = "화주 문의 생성")
    @ApiResponse(
            responseCode = "200",
            description = "생성된 문의 반환",
            content = @Content(
                    mediaType = "application/json",
                    schema = @Schema(implementation = InquiryResponse.class)
            )
    )
    @PostMapping("/shipper/inquiries")
    public ResponseEntity<InquiryResponse> create(
            @AuthenticationPrincipal UserDetails userDetails,
            @Valid @RequestBody InquiryCreateRequest request
    ) {
        Long shipperId = requireShipperId(userDetails);
        return ResponseEntity.ok(inquiryService.createByShipper(shipperId, request));
    }

    @Operation(summary = "화주 내 문의 목록 조회")
    @ApiResponse(
            responseCode = "200",
            description = "문의 목록 반환",
            content = @Content(
                    mediaType = "application/json",
                    array = @ArraySchema(schema = @Schema(implementation = InquiryResponse.class))
            )
    )
    @GetMapping("/shipper/inquiries/me")
    public ResponseEntity<List<InquiryResponse>> myInquiries(
            @AuthenticationPrincipal UserDetails userDetails
    ) {
        Long shipperId = requireShipperId(userDetails);
        return ResponseEntity.ok(inquiryService.getMyInquiries(shipperId));
    }

    @Operation(summary = "기사 문의 생성")
    @ApiResponse(
            responseCode = "200",
            description = "생성된 문의 반환",
            content = @Content(
                    mediaType = "application/json",
                    schema = @Schema(implementation = InquiryResponse.class)
            )
    )
    @PostMapping("/driver/inquiries")
    public ResponseEntity<InquiryResponse> createByDriver(
            @AuthenticationPrincipal UserDetails userDetails,
            @Valid @RequestBody InquiryCreateRequest request
    ) {
        Long driverId = requireDriverId(userDetails);
        return ResponseEntity.ok(inquiryService.createByDriver(driverId, request));
    }

    @Operation(summary = "기사 내 문의 목록 조회")
    @ApiResponse(
            responseCode = "200",
            description = "문의 목록 반환",
            content = @Content(
                    mediaType = "application/json",
                    array = @ArraySchema(schema = @Schema(implementation = InquiryResponse.class))
            )
    )
    @GetMapping("/driver/inquiries/me")
    public ResponseEntity<List<InquiryResponse>> myDriverInquiries(
            @AuthenticationPrincipal UserDetails userDetails
    ) {
        Long driverId = requireDriverId(userDetails);
        return ResponseEntity.ok(inquiryService.getDriverInquiries(driverId));
    }

    @Operation(summary = "관리자 전체 문의 조회")
    @ApiResponse(
            responseCode = "200",
            description = "문의 목록 반환",
            content = @Content(
                    mediaType = "application/json",
                    array = @ArraySchema(schema = @Schema(implementation = InquiryResponse.class))
            )
    )
    @GetMapping("/admin/inquiries")
    public ResponseEntity<List<InquiryResponse>> allInquiries(
            @AuthenticationPrincipal UserDetails userDetails
    ) {
        requireAdminId(userDetails);
        return ResponseEntity.ok(inquiryService.getAllForAdmin());
    }

    @Operation(summary = "관리자 문의 답변")
    @ApiResponse(
            responseCode = "200",
            description = "답변된 문의 반환",
            content = @Content(
                    mediaType = "application/json",
                    schema = @Schema(implementation = InquiryResponse.class)
            )
    )
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
        if (userDetails == null || !SecurityUtils.hasAuthority(userDetails, "ROLE_SHIPPER")) {
            throw new CustomException(ErrorCode.AUTH_FORBIDDEN);
        }
        return Long.parseLong(userDetails.getUsername());
    }

    private static Long requireAdminId(UserDetails userDetails) {
        if (userDetails == null || !SecurityUtils.isAdmin(userDetails)) {
            throw new CustomException(ErrorCode.AUTH_FORBIDDEN);
        }
        return Long.parseLong(userDetails.getUsername());
    }

    private static Long requireDriverId(UserDetails userDetails) {
        if (userDetails == null || !SecurityUtils.hasAuthority(userDetails, "ROLE_DRIVER")) {
            throw new CustomException(ErrorCode.AUTH_FORBIDDEN);
        }
        return Long.parseLong(userDetails.getUsername());
    }
}
