package com.freight.backend.controller;

import com.freight.backend.dto.shipper.ShipperPaymentMethodSummaryResponse;
import com.freight.backend.service.ShipperSettingsService;
import com.freight.backend.util.SecurityUtils;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/shipper/settings")
public class ShipperSettingsController {

    private final ShipperSettingsService shipperSettingsService;

    @GetMapping("/payment-methods")
    public ResponseEntity<List<ShipperPaymentMethodSummaryResponse>> listPaymentMethods(
            @AuthenticationPrincipal UserDetails userDetails
    ) {
        Long shipperId = SecurityUtils.requireShipperId(userDetails);
        return ResponseEntity.ok(shipperSettingsService.listPaymentMethods(shipperId));
    }
}
