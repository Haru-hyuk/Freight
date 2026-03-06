package com.freight.backend.controller;

import com.freight.backend.dto.settlement.DriverSettlementSummaryResponse;
import com.freight.backend.dto.settlement.SettlementResponse;
import com.freight.backend.entity.Settlement;
import com.freight.backend.service.SettlementService;
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
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/driver/settlements")
@RequiredArgsConstructor
@Tag(name = "Driver Settlement", description = "기사 정산 API")
public class DriverSettlementController {

    private final SettlementService settlementService;

    @Operation(summary = "내 정산 목록 조회")
    @ApiResponse(
            responseCode = "200",
            description = "정산 목록 반환",
            content = @Content(
                    mediaType = "application/json",
                    array = @ArraySchema(schema = @Schema(implementation = SettlementResponse.class))
            )
    )
    @GetMapping("/me")
    public ResponseEntity<List<SettlementResponse>> getMySettlements(
            @AuthenticationPrincipal UserDetails userDetails
    ) {
        Long driverId = SecurityUtils.requireDriverId(userDetails);
        List<SettlementResponse> rows = settlementService.getDriverSettlements(driverId).stream()
                .map(SettlementResponse::from)
                .toList();
        return ResponseEntity.ok(rows);
    }

    @Operation(summary = "내 정산 집계 조회")
    @ApiResponse(
            responseCode = "200",
            description = "기사 정산 합계 반환",
            content = @Content(
                    mediaType = "application/json",
                    schema = @Schema(implementation = DriverSettlementSummaryResponse.class)
            )
    )
    @GetMapping("/me/summary")
    public ResponseEntity<DriverSettlementSummaryResponse> getMySettlementSummary(
            @AuthenticationPrincipal UserDetails userDetails
    ) {
        Long driverId = SecurityUtils.requireDriverId(userDetails);
        return ResponseEntity.ok(settlementService.getDriverSettlementSummary(driverId));
    }

    @Operation(summary = "매칭별 정산 조회")
    @ApiResponse(
            responseCode = "200",
            description = "정산 정보 반환",
            content = @Content(
                    mediaType = "application/json",
                    schema = @Schema(implementation = SettlementResponse.class)
            )
    )
    @GetMapping
    public ResponseEntity<SettlementResponse> getByMatch(
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestParam Long matchId
    ) {
        Long driverId = SecurityUtils.requireDriverId(userDetails);
        Settlement settlement = settlementService.getSettlementForDriver(driverId, matchId);
        return ResponseEntity.ok(SettlementResponse.from(settlement));
    }
}
