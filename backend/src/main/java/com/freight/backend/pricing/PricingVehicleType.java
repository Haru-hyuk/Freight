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

    public int getDefaultCapacityKg() {
        return switch (this) {
            case DAMAS -> 350;
            case LABO -> 500;
            case TON_1 -> 1000;
            case TON_1_4 -> 1400;
            case TON_2_5 -> 2500;
            case TON_3_5 -> 3500;
            case TON_5 -> 5000;
            case TON_5_AXLE -> 5500;
            case TON_8 -> 8000;
            case TON_11 -> 11000;
            case TON_14 -> 14000;
            case TON_15 -> 15000;
            case TON_18 -> 18000;
            case TON_25 -> 25000;
        };
    }

    public static PricingVehicleType nextHigher(PricingVehicleType current) {
        if (current == null) {
            return null;
        }
        PricingVehicleType[] values = PricingVehicleType.values();
        for (int i = 0; i < values.length - 1; i++) {
            if (values[i] == current) {
                return values[i + 1];
            }
        }
        return null;
    }

    public static PricingVehicleType from(String value) {
        if (value == null) {
            return null;
        }
        return PricingVehicleType.valueOf(value);
    }
}
