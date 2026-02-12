package com.freight.backend.pricing;

import java.math.BigDecimal;

public record PricingResult(
        PricingVehicleType vehicleType,
        String distanceRangeKey,
        BigDecimal rateWon,
        BigDecimal baseTotalWon,
        BigDecimal extraMinWon,
        BigDecimal extraMaxWon,
        BigDecimal totalMinWon,
        BigDecimal totalMaxWon,
        BigDecimal totalMidWon,
        BigDecimal weightedWon,
        BigDecimal platformFeeRate,
        BigDecimal platformFeeWon,
        BigDecimal finalChargeWon,
        boolean combinedShipment,
        BigDecimal combineDiscountRate,
        BigDecimal combineDiscountWon,
        BigDecimal finalChargeAfterDiscountWon
) {
}
