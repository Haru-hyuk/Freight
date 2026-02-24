package com.freight.backend.controller;

import com.freight.backend.dto.settlement.SettlementResponse;
import com.freight.backend.entity.Settlement;
import com.freight.backend.service.SettlementService;
import com.freight.backend.util.SecurityUtils;
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
public class DriverSettlementController {

    private final SettlementService settlementService;

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
