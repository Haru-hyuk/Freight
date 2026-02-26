package com.freight.backend.dto.reference;

import java.math.BigDecimal;

public record TruckSpecReferenceResponse(
        String vehicleType,
        String vehicleTypeKr,
        String vehicleBodyType,
        String categoryKr,
        BigDecimal tonnage,
        BigDecimal maxWeight,
        String maxWeightDisplay,
        BigDecimal maxVolume,
        Integer cargoLengthCm,
        Integer cargoWidthCm,
        Integer cargoHeightCm,
        Integer palletCount,
        String palletStandardMm,
        String doorPosition,
        String sourceName
) {
}
