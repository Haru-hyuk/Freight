package com.freight.backend.dto.reference;

public record PricingRateReferenceResponse(
        String rangeKey,
        Integer minDistanceKm,
        Integer maxDistanceKm,
        String vehicleType,
        Integer baseRateWon,
        String sourceName
) {
}
