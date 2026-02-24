package com.freight.backend.controller;

import com.freight.backend.dto.reference.PricingRateReferenceResponse;
import com.freight.backend.dto.reference.TruckSpecReferenceResponse;
import com.freight.backend.service.ReferenceCatalogQueryService;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * 기준표 조회 API.
 * - 화물차 표준 제원
 * - 거리 구간별 기본 운임
 */
@RestController
@RequestMapping("/api/reference")
@RequiredArgsConstructor
public class ReferenceCatalogController {

    private final ReferenceCatalogQueryService referenceCatalogQueryService;

    @GetMapping("/truck-specs")
    public ResponseEntity<List<TruckSpecReferenceResponse>> getTruckSpecs(
            @RequestParam(required = false) String vehicleType
    ) {
        return ResponseEntity.ok(referenceCatalogQueryService.getTruckSpecs(vehicleType));
    }

    @GetMapping("/pricing-rates")
    public ResponseEntity<List<PricingRateReferenceResponse>> getPricingRates(
            @RequestParam(required = false) String vehicleType
    ) {
        return ResponseEntity.ok(referenceCatalogQueryService.getPricingRates(vehicleType));
    }

    @GetMapping("/pricing-rate")
    public ResponseEntity<PricingRateReferenceResponse> getPricingRate(
            @RequestParam int distanceKm,
            @RequestParam String vehicleType
    ) {
        return ResponseEntity.ok(referenceCatalogQueryService.getPricingRate(distanceKm, vehicleType));
    }
}
