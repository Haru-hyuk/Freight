package com.freight.backend.pricing;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.Collections;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("PricingCalculator - 운임 계산 테스트")
class PricingCalculatorTest {

    @Mock
    private PricingRateTable rateTable;

    private PricingCalculator calculator;

    @BeforeEach
    void setUp() {
        calculator = new PricingCalculator(rateTable);
    }

    @Test
    @DisplayName("기본 운임이 올바르게 계산되어야 한다")
    void shouldCalculateBasicPricing() {
        // given: 50km, 1톤 차량, 기본 운임 50,000원
        int distanceKm = 50;
        PricingVehicleType vehicleType = PricingVehicleType.TON_1;
        when(rateTable.getRate(distanceKm, vehicleType)).thenReturn(50000);

        // when
        PricingResult result = calculator.estimate(
            distanceKm,
            vehicleType,
            Collections.emptySet(),
            LoadHandlingMethod.SHIPPER,
            LoadHandlingMethod.SHIPPER,
            false
        );

        // then
        assertThat(result.vehicleType()).isEqualTo(vehicleType);
        assertThat(result.rateWon()).isEqualByComparingTo(new BigDecimal("50000"));
        assertThat(result.platformFeeRate()).isEqualByComparingTo(new BigDecimal("0.10"));
    }

    @Test
    @DisplayName("합짐 할인이 30% 적용되어야 한다")
    void shouldApplyCombineDiscount() {
        // given: 합짐 허용된 운송
        int distanceKm = 50;
        PricingVehicleType vehicleType = PricingVehicleType.TON_1;
        when(rateTable.getRate(distanceKm, vehicleType)).thenReturn(100000);

        // when: 합짐 허용
        PricingResult withCombine = calculator.estimate(
            distanceKm,
            vehicleType,
            Collections.emptySet(),
            LoadHandlingMethod.SHIPPER,
            LoadHandlingMethod.SHIPPER,
            true  // 합짐 허용
        );

        // when: 합짐 비허용
        PricingResult withoutCombine = calculator.estimate(
            distanceKm,
            vehicleType,
            Collections.emptySet(),
            LoadHandlingMethod.SHIPPER,
            LoadHandlingMethod.SHIPPER,
            false  // 합짐 비허용
        );

        // then: 합짐 시 30% 할인 적용
        assertThat(withCombine.combinedShipment()).isTrue();
        assertThat(withCombine.combineDiscountRate()).isEqualByComparingTo(new BigDecimal("0.30"));
        assertThat(withCombine.finalChargeAfterDiscountWon())
            .isLessThan(withoutCombine.finalChargeAfterDiscountWon());
    }

    @Test
    @DisplayName("기사 상/하차 시 추가 비용이 발생해야 한다")
    void shouldAddDriverLoadingFee() {
        // given
        int distanceKm = 50;
        PricingVehicleType vehicleType = PricingVehicleType.TON_1;
        when(rateTable.getRate(distanceKm, vehicleType)).thenReturn(50000);

        // when: 화주 직접 상/하차
        PricingResult shipperHandle = calculator.estimate(
            distanceKm,
            vehicleType,
            Collections.emptySet(),
            LoadHandlingMethod.SHIPPER,
            LoadHandlingMethod.SHIPPER,
            false
        );

        // when: 기사 상/하차
        PricingResult driverHandle = calculator.estimate(
            distanceKm,
            vehicleType,
            Collections.emptySet(),
            LoadHandlingMethod.DRIVER,
            LoadHandlingMethod.DRIVER,
            false
        );

        // then: 기사 상/하차 시 추가 비용 발생 (상차 10,000 + 하차 10,000)
        assertThat(driverHandle.weightedWon())
            .isGreaterThan(shipperHandle.weightedWon());
    }

    @Test
    @DisplayName("지원되지 않는 거리 범위는 예외를 발생시켜야 한다")
    void shouldThrowExceptionForUnsupportedDistance() {
        // given: 지원 범위 밖의 거리 (예: 음수)
        int invalidDistance = -1;

        // when & then
        assertThatThrownBy(() -> calculator.estimate(
            invalidDistance,
            PricingVehicleType.TON_1,
            Collections.emptySet(),
            LoadHandlingMethod.SHIPPER,
            LoadHandlingMethod.SHIPPER,
            false
        )).isInstanceOf(IllegalArgumentException.class)
          .hasMessageContaining("outside supported ranges");
    }

    @Test
    @DisplayName("운임 테이블에 없는 차량 타입은 예외를 발생시켜야 한다")
    void shouldThrowExceptionForUnsupportedVehicleType() {
        // given
        int distanceKm = 50;
        PricingVehicleType vehicleType = PricingVehicleType.TON_1;
        when(rateTable.getRate(distanceKm, vehicleType)).thenReturn(null);

        // when & then
        assertThatThrownBy(() -> calculator.estimate(
            distanceKm,
            vehicleType,
            Collections.emptySet(),
            LoadHandlingMethod.SHIPPER,
            LoadHandlingMethod.SHIPPER,
            false
        )).isInstanceOf(IllegalArgumentException.class)
          .hasMessageContaining("unsupported vehicle type");
    }
}
