package com.freight.backend.controller;

import com.freight.backend.dto.settlement.SettlementResponse;
import com.freight.backend.entity.Settlement;
import com.freight.backend.exception.CustomException;
import com.freight.backend.exception.ErrorCode;
import com.freight.backend.service.SettlementService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.ArraySchema;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.util.List;
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
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/shipper/settlements")
@RequiredArgsConstructor
@Tag(name = "Shipper Settlement", description = "화주 정산 API")
public class ShipperSettlementController {

    private final SettlementService settlementService;

    private static Long requireShipperId(UserDetails userDetails) {
        if (userDetails == null || !userDetails.getAuthorities().contains(new SimpleGrantedAuthority("ROLE_SHIPPER"))) {
            throw new CustomException(ErrorCode.AUTH_FORBIDDEN);
        }
        return Long.parseLong(userDetails.getUsername());
    }

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
        Long shipperId = requireShipperId(userDetails);
        List<SettlementResponse> rows = settlementService.getShipperSettlements(shipperId).stream()
                .map(SettlementResponse::from)
                .toList();
        return ResponseEntity.ok(rows);
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
        Long shipperId = requireShipperId(userDetails);
        Settlement settlement = settlementService.getSettlementForShipper(shipperId, matchId);
        return ResponseEntity.ok(SettlementResponse.from(settlement));
    }

    @Operation(summary = "정산 확정")
    @ApiResponse(
            responseCode = "200",
            description = "확정된 정산 정보 반환",
            content = @Content(
                    mediaType = "application/json",
                    schema = @Schema(implementation = SettlementResponse.class)
            )
    )
    @PostMapping("/{matchId}/confirm")
    public ResponseEntity<SettlementResponse> confirmSettlement(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable Long matchId
    ) {
        Long shipperId = requireShipperId(userDetails);
        Settlement updated = settlementService.confirmByShipper(shipperId, matchId);
        return ResponseEntity.ok(SettlementResponse.from(updated));
    }
}
