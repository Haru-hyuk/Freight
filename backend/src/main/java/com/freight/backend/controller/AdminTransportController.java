package com.freight.backend.controller;

import com.freight.backend.dto.admin.AdminPricingVehicleUpdateRequest;
import com.freight.backend.exception.CustomException;
import com.freight.backend.exception.ErrorCode;
import com.freight.backend.service.AdminTransportService;
import com.freight.backend.util.SecurityUtils;
import java.util.List;
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
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/admin")
public class AdminTransportController {

    private final AdminTransportService adminTransportService;

    @GetMapping("/quotes")
    public ResponseEntity<List<Map<String, Object>>> quotes(@AuthenticationPrincipal UserDetails userDetails) {
        requireAdmin(userDetails);
        return ResponseEntity.ok(adminTransportService.listQuotes());
    }

    @GetMapping("/quotes/{quoteId}")
    public ResponseEntity<Map<String, Object>> quote(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable Long quoteId
    ) {
        requireAdmin(userDetails);
        return ResponseEntity.ok(adminTransportService.getQuote(quoteId));
    }

    @GetMapping("/matches")
    public ResponseEntity<List<Map<String, Object>>> matches(@AuthenticationPrincipal UserDetails userDetails) {
        requireAdmin(userDetails);
        return ResponseEntity.ok(adminTransportService.listMatches());
    }

    @GetMapping("/matches/{matchId}")
    public ResponseEntity<Map<String, Object>> match(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable Long matchId
    ) {
        requireAdmin(userDetails);
        return ResponseEntity.ok(adminTransportService.getMatch(matchId));
    }

    @GetMapping("/payments")
    public ResponseEntity<List<Map<String, Object>>> payments(@AuthenticationPrincipal UserDetails userDetails) {
        requireAdmin(userDetails);
        return ResponseEntity.ok(adminTransportService.listPayments());
    }

    @GetMapping("/settlements")
    public ResponseEntity<List<Map<String, Object>>> settlements(@AuthenticationPrincipal UserDetails userDetails) {
        requireAdmin(userDetails);
        return ResponseEntity.ok(adminTransportService.listSettlements());
    }

    @GetMapping("/pricing-rates")
    public ResponseEntity<List<Map<String, Object>>> pricingRates(@AuthenticationPrincipal UserDetails userDetails) {
        requireAdmin(userDetails);
        return ResponseEntity.ok(adminTransportService.listPricingRates());
    }

    @PatchMapping("/pricing-rates/{rateId}")
    public ResponseEntity<Map<String, Object>> updatePricingRate(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable String rateId,
            @Valid @RequestBody(required = false) AdminPricingVehicleUpdateRequest request
    ) {
        requireAdmin(userDetails);
        return ResponseEntity.ok(adminTransportService.updatePricingRate(rateId, request));
    }

    private static void requireAdmin(UserDetails userDetails) {
        if (userDetails == null || !SecurityUtils.isAdmin(userDetails)) {
            throw new CustomException(ErrorCode.AUTH_FORBIDDEN);
        }
    }
}
