package com.freight.backend.pricing;

public enum PricingVehicleType {
    DAMAS,
    LABO,
    TON_1,
    TON_1_4,
    TON_2_5,
    TON_3_5,
    TON_5,
    TON_5_AXLE,
    TON_8,
    TON_11,
    TON_14,
    TON_15,
    TON_18,
    TON_25;

    public static PricingVehicleType from(String value) {
        if (value == null) {
            return null;
        }
        return PricingVehicleType.valueOf(value);
    }
}
