package com.freight.backend.pricing;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.Set;
import org.springframework.stereotype.Component;

/**
 * 운임 계산기
 * - 기본요금 + 할증 계산
 * - 플랫폼 수수료 적용
 * - 합짐 할인 적용
 */
@Component
public class PricingCalculator {
    private static final BigDecimal MULTIPLIER_ONE = BigDecimal.ONE;
    private static final BigDecimal FOUR = new BigDecimal("4");
    private static final BigDecimal SIX = new BigDecimal("6");
    private static final BigDecimal PLATFORM_FEE_RATE = new BigDecimal("0.10");   // 10% 플랫폼 수수료
    private static final BigDecimal COMBINE_DISCOUNT_RATE = new BigDecimal("0.30"); // 30% 합짐 할인
    private static final BigDecimal LOAD_UNLOAD_DRIVER_FEE = new BigDecimal("10000"); // 기사 상하차 시 1만원 추가

    private final PricingRateTable rateTable;

    public PricingCalculator(PricingRateTable rateTable) {
        this.rateTable = rateTable;
    }

    public PricingResult estimate(
            int distanceKm,
            PricingVehicleType vehicleType,
            Set<SurchargeOptionRule> options,
            LoadHandlingMethod loadMethod,
            LoadHandlingMethod unloadMethod,
            boolean combinedShipment
    ) {
        int normalizedDistanceKm = normalizeDistanceKm(distanceKm);
        String rangeKey = DistanceRangeResolver.resolveKey(normalizedDistanceKm);
        if (rangeKey == null) {
            throw new IllegalArgumentException("distanceKm is outside supported ranges");
        }
        Integer rate = rateTable.getRate(normalizedDistanceKm, vehicleType);
        if (rate == null) {
            throw new IllegalArgumentException("unsupported vehicle type for rate table");
        }
        BigDecimal rateWon = new BigDecimal(rate);
        BigDecimal baseTotalWon = rateWon;

        SurchargeSummary surchargeSummary = calculateSurcharges(
                options,
                baseTotalWon,
                vehicleType,
                loadMethod,
                unloadMethod
        );
        BigDecimal totalMidWon = surchargeSummary.totalMinWon()
                .add(surchargeSummary.totalMaxWon())
                .divide(new BigDecimal("2"), RoundingMode.HALF_UP);
        // PERT 가중평균: (min + 4*mid + max) / 6
        BigDecimal weightedWon = surchargeSummary.totalMinWon()
                .add(totalMidWon.multiply(FOUR))
                .add(surchargeSummary.totalMaxWon())
                .divide(SIX, RoundingMode.HALF_UP);
        BigDecimal platformFeeWon = weightedWon
                .multiply(PLATFORM_FEE_RATE)
                .setScale(0, RoundingMode.HALF_UP);
        BigDecimal finalChargeWon = weightedWon.add(platformFeeWon);
        BigDecimal combineDiscountWon = BigDecimal.ZERO;
        if (combinedShipment) {
            combineDiscountWon = finalChargeWon
                    .multiply(COMBINE_DISCOUNT_RATE)
                    .setScale(0, RoundingMode.HALF_UP);
        }
        BigDecimal finalChargeAfterDiscountWon = finalChargeWon.subtract(combineDiscountWon);

        return new PricingResult(
                vehicleType,
                rangeKey,
                rateWon,
                baseTotalWon,
                surchargeSummary.extraMinWon(),
                surchargeSummary.extraMaxWon(),
                surchargeSummary.totalMinWon(),
                surchargeSummary.totalMaxWon(),
                totalMidWon,
                weightedWon,
                PLATFORM_FEE_RATE,
                platformFeeWon,
                finalChargeWon,
                combinedShipment,
                COMBINE_DISCOUNT_RATE,
                combineDiscountWon,
                finalChargeAfterDiscountWon
        );
    }

    private int normalizeDistanceKm(int rawDistanceKm) {
        if (rawDistanceKm <= 0) {
            return rawDistanceKm;
        }
        // Defensive conversion when upstream returns meters.
        if (rawDistanceKm > 500) {
            return Math.max(1, (int) Math.round(rawDistanceKm / 1000.0d));
        }
        return rawDistanceKm;
    }

    /** 할증 계산 (차종옵션 + 상하차방식) */
    private SurchargeSummary calculateSurcharges(
            Set<SurchargeOptionRule> options,
            BigDecimal baseTotalWon,
            PricingVehicleType vehicleType,
            LoadHandlingMethod loadMethod,
            LoadHandlingMethod unloadMethod
    ) {
        boolean hasOptions = options != null && !options.isEmpty();

        BigDecimal addMin = BigDecimal.ZERO;
        BigDecimal addMax = BigDecimal.ZERO;
        BigDecimal multMin = MULTIPLIER_ONE;
        BigDecimal multMax = MULTIPLIER_ONE;
        boolean hasMultiplier = false;
        if (hasOptions) {
            for (SurchargeOptionRule option : options) {
                if (option.isFixedByVehicle()) {
                    BigDecimal fixedAdd = option.resolveFixedAdd(vehicleType);
                    if (fixedAdd == null) {
                        throw new IllegalArgumentException("option not available for vehicle type: " + option.getCode());
                    }
                    addMin = addMin.add(fixedAdd);
                    addMax = addMax.add(fixedAdd);
                    continue;
                }

                if (option.isAdditive()) {
                    addMin = addMin.add(option.getMinAddWon());
                    addMax = addMax.add(option.getMaxAddWon());
                }

                if (option.isMultiplier()) {
                    if (hasMultiplier) {
                        throw new IllegalArgumentException("multiple multiplier options are not supported");
                    }
                    hasMultiplier = true;
                    multMin = option.getMinMultiplier();
                    multMax = option.getMaxMultiplier();
                }
            }
        }

        if (loadMethod == LoadHandlingMethod.DRIVER) {
            addMin = addMin.add(LOAD_UNLOAD_DRIVER_FEE);
            addMax = addMax.add(LOAD_UNLOAD_DRIVER_FEE);
        }

        if (unloadMethod == LoadHandlingMethod.DRIVER) {
            addMin = addMin.add(LOAD_UNLOAD_DRIVER_FEE);
            addMax = addMax.add(LOAD_UNLOAD_DRIVER_FEE);
        }

        BigDecimal totalMin = baseTotalWon.multiply(multMin).add(addMin);
        BigDecimal totalMax = baseTotalWon.multiply(multMax).add(addMax);
        return new SurchargeSummary(addMin, addMax, totalMin, totalMax);
    }

    private record SurchargeSummary(
            BigDecimal extraMinWon,
            BigDecimal extraMaxWon,
            BigDecimal totalMinWon,
            BigDecimal totalMaxWon
    ) {
    }
}
