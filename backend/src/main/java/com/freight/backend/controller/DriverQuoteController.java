package com.freight.backend.controller;

import com.freight.backend.dto.quote.DriverQuoteSummaryResponse;
import com.freight.backend.exception.CustomException;
import com.freight.backend.exception.ErrorCode;
import com.freight.backend.service.QuoteService;
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
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.bind.annotation.RequestParam;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/driver/quotes")
@Tag(name = "Driver Quote", description = "기사용 견적 조회 API")
public class DriverQuoteController {

    private final QuoteService quoteService;

    @Operation(summary = "견적 요약 조회")
    @ApiResponse(
            responseCode = "200",
            description = "견적 요약 정보 반환",
            content = @Content(
                    mediaType = "application/json",
                    schema = @Schema(implementation = DriverQuoteSummaryResponse.class)
            )
    )
    @GetMapping("/{quoteId}/summary")
    public ResponseEntity<DriverQuoteSummaryResponse> getQuoteSummary(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable Long quoteId
    ) {
        requireDriver(userDetails);
        return ResponseEntity.ok(quoteService.getDriverQuoteSummary(quoteId));
    }

    @Operation(summary = "다건 견적 요약 조회")
    @ApiResponse(
            responseCode = "200",
            description = "견적 요약 목록 반환",
            content = @Content(
                    mediaType = "application/json",
                    array = @ArraySchema(schema = @Schema(implementation = DriverQuoteSummaryResponse.class))
            )
    )
    @GetMapping("/summaries")
    public ResponseEntity<List<DriverQuoteSummaryResponse>> getQuoteSummaries(
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestParam List<Long> quoteIds
    ) {
        requireDriver(userDetails);
        return ResponseEntity.ok(quoteService.getDriverQuoteSummaries(quoteIds));
    }

    private static void requireDriver(UserDetails userDetails) {
        if (userDetails == null || !userDetails.getAuthorities().contains(new SimpleGrantedAuthority("ROLE_DRIVER"))) {
            throw new CustomException(ErrorCode.AUTH_FORBIDDEN);
        }
    }
}
