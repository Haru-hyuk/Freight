package com.freight.backend.pricing;

import java.math.BigDecimal;

public enum SurchargeOption {
    LIFT_WINGBODY(fixedByVehicle()),
    LIFT_HORO(fixedByVehicle()),
    HORO_JABARA(fixedByVehicle()),
    WINGBODY_TOP(fixed("30000")),
    LIFT(fixedByVehicle()),
    COLD_CHAIN(addRange("50000", "100000")),
    HANGER(addRange("50000", "100000")),
    ANTI_VIBRATION_WINGBODY(multRange("2.0", "2.5"));

    private final BigDecimal minAddWon;
    private final BigDecimal maxAddWon;
    private final BigDecimal minMultiplier;
    private final BigDecimal maxMultiplier;
    private final boolean fixedByVehicle;

    SurchargeOption(OptionRule rule) {
        this.minAddWon = rule.minAddWon;
        this.maxAddWon = rule.maxAddWon;
        this.minMultiplier = rule.minMultiplier;
        this.maxMultiplier = rule.maxMultiplier;
        this.fixedByVehicle = rule.fixedByVehicle;
    }

    public boolean isAdditive() {
        return minAddWon != null || maxAddWon != null;
    }

    public boolean isMultiplier() {
        return minMultiplier != null || maxMultiplier != null;
    }

    public boolean isFixedByVehicle() {
        return fixedByVehicle;
    }

    public BigDecimal resolveFixedAdd(PricingVehicleType vehicleType) {
        if (!fixedByVehicle || vehicleType == null) {
            return null;
        }

        return switch (this) {
            case WINGBODY_TOP -> new BigDecimal("30000");
            case LIFT_WINGBODY -> liftWingbodyAdd(vehicleType);
            case LIFT_HORO -> liftHoroAdd(vehicleType);
            case HORO_JABARA -> horoJabaraAdd(vehicleType);
            case LIFT -> liftAdd(vehicleType);
            default -> null;
        };
    }

    public BigDecimal getMinAddWon() {
        return minAddWon;
    }

    public BigDecimal getMaxAddWon() {
        return maxAddWon;
    }

    public BigDecimal getMinMultiplier() {
        return minMultiplier;
    }

    public BigDecimal getMaxMultiplier() {
        return maxMultiplier;
    }

    public static SurchargeOption fromCode(String value) {
        if (value == null) {
            return null;
        }
        return SurchargeOption.valueOf(value);
    }

    private static BigDecimal liftWingbodyAdd(PricingVehicleType type) {
        return switch (type) {
            case TON_1 -> new BigDecimal("40000");
            case TON_1_4 -> new BigDecimal("50000");
            case TON_2_5 -> new BigDecimal("80000");
            case TON_3_5 -> new BigDecimal("90000");
            case TON_5 -> new BigDecimal("100000");
            case TON_5_AXLE, TON_8 -> new BigDecimal("120000");
            case TON_11, TON_14, TON_15, TON_18, TON_25 -> new BigDecimal("150000");
            default -> null;
        };
    }

    private static BigDecimal liftHoroAdd(PricingVehicleType type) {
        return switch (type) {
            case TON_1 -> new BigDecimal("15000");
            case TON_1_4 -> new BigDecimal("25000");
            default -> null;
        };
    }

    private static BigDecimal horoJabaraAdd(PricingVehicleType type) {
        return switch (type) {
            case TON_1 -> new BigDecimal("5000");
            case TON_1_4 -> new BigDecimal("10000");
            default -> null;
        };
    }

    private static BigDecimal liftAdd(PricingVehicleType type) {
        return switch (type) {
            case TON_1 -> new BigDecimal("10000");
            case TON_1_4 -> new BigDecimal("15000");
            case TON_2_5 -> new BigDecimal("50000");
            case TON_3_5 -> new BigDecimal("60000");
            case TON_5 -> new BigDecimal("80000");
            case TON_5_AXLE, TON_8 -> new BigDecimal("100000");
            case TON_11, TON_14, TON_15, TON_18, TON_25 -> new BigDecimal("130000");
            default -> null;
        };
    }

    private static OptionRule addRange(String min, String max) {
        return new OptionRule(new BigDecimal(min), new BigDecimal(max), null, null, false);
    }

    private static OptionRule multRange(String min, String max) {
        return new OptionRule(null, null, new BigDecimal(min), new BigDecimal(max), false);
    }

    private static OptionRule fixed(String amount) {
        BigDecimal value = new BigDecimal(amount);
        return new OptionRule(value, value, null, null, false);
    }

    private static OptionRule fixedByVehicle() {
        return new OptionRule(null, null, null, null, true);
    }

    private record OptionRule(
            BigDecimal minAddWon,
            BigDecimal maxAddWon,
            BigDecimal minMultiplier,
            BigDecimal maxMultiplier,
            boolean fixedByVehicle
    ) {
    }
}
