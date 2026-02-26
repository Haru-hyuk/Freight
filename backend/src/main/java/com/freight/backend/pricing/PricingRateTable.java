package com.freight.backend.pricing;

import java.util.Optional;
import org.springframework.stereotype.Component;

/**
 * 운임 기준 조회 컴포넌트.
 * 조회 소스는 DB 테이블(pricing_rate_catalog) 단일 사용.
 */
@Component
public class PricingRateTable {

    private final PricingRateCatalogRepository pricingRateCatalogRepository;

    public PricingRateTable(PricingRateCatalogRepository pricingRateCatalogRepository) {
        this.pricingRateCatalogRepository = pricingRateCatalogRepository;
    }

    public Integer getRate(int distanceKm, PricingVehicleType vehicleType) {
        String rangeKey = DistanceRangeResolver.resolveKey(distanceKm);
        if (rangeKey == null || vehicleType == null) {
            return null;
        }

        Optional<PricingRateCatalog> dbRate =
                pricingRateCatalogRepository.findByRangeKeyAndVehicleType(rangeKey, vehicleType.name());
        return dbRate.map(PricingRateCatalog::getBaseRateWon).orElse(null);
    }
}
