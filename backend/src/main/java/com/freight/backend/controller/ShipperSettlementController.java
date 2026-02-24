package com.freight.backend.controller;

import com.freight.backend.dto.settlement.SettlementResponse;
import com.freight.backend.entity.Settlement;
import com.freight.backend.exception.CustomException;
import com.freight.backend.exception.ErrorCode;
import com.freight.backend.service.SettlementService;
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
public class ShipperSettlementController {

    private final SettlementService settlementService;

    private static Long requireShipperId(UserDetails userDetails) {
        if (userDetails == null || !userDetails.getAuthorities().contains(new SimpleGrantedAuthority("ROLE_SHIPPER"))) {
            throw new CustomException(ErrorCode.AUTH_FORBIDDEN);
        }
        return Long.parseLong(userDetails.getUsername());
    }

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

    @GetMapping
    public ResponseEntity<SettlementResponse> getByMatch(
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestParam Long matchId
    ) {
        Long shipperId = requireShipperId(userDetails);
        Settlement settlement = settlementService.getSettlementForShipper(shipperId, matchId);
        return ResponseEntity.ok(SettlementResponse.from(settlement));
    }

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
