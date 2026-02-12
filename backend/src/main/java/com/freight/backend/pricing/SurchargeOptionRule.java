package com.freight.backend.pricing;

import java.math.BigDecimal;
import java.util.Map;

public class SurchargeOptionRule {

    private final String code;
    private final SurchargeOptionType optionType;
    private final BigDecimal minAddWon;
    private final BigDecimal maxAddWon;
    private final BigDecimal minMultiplier;
    private final BigDecimal maxMultiplier;
    private final BigDecimal fixedAddWon;
    private final Map<String, BigDecimal> vehicleAdds;

    public SurchargeOptionRule(
            String code,
            SurchargeOptionType optionType,
            BigDecimal minAddWon,
            BigDecimal maxAddWon,
            BigDecimal minMultiplier,
            BigDecimal maxMultiplier,
            BigDecimal fixedAddWon,
            Map<String, BigDecimal> vehicleAdds
    ) {
        this.code = code;
        this.optionType = optionType;
        this.minAddWon = minAddWon;
        this.maxAddWon = maxAddWon;
        this.minMultiplier = minMultiplier;
        this.maxMultiplier = maxMultiplier;
        this.fixedAddWon = fixedAddWon;
        this.vehicleAdds = vehicleAdds;
    }

    public String getCode() {
        return code;
    }

    public boolean isAdditive() {
        return optionType == SurchargeOptionType.ADD || optionType == SurchargeOptionType.FIXED;
    }

    public boolean isMultiplier() {
        return optionType == SurchargeOptionType.MULT;
    }

    public boolean isFixedByVehicle() {
        return optionType == SurchargeOptionType.FIXED_BY_VEHICLE;
    }

    public BigDecimal resolveFixedAdd(PricingVehicleType vehicleType) {
        if (optionType == SurchargeOptionType.FIXED) {
            return fixedAddWon;
        }
        if (optionType == SurchargeOptionType.FIXED_BY_VEHICLE && vehicleAdds != null && vehicleType != null) {
            return vehicleAdds.get(vehicleType.name());
        }
        return null;
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
}
