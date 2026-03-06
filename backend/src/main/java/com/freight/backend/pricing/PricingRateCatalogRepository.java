package com.freight.backend.pricing;

import java.util.List;
import java.util.Optional;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

/**
 * 거리 구간/차종별 기본 운임 기준표 조회 Repository.
 */
public interface PricingRateCatalogRepository extends JpaRepository<PricingRateCatalog, Long> {

    Optional<PricingRateCatalog> findByRangeKeyAndVehicleType(String rangeKey, String vehicleType);

    List<PricingRateCatalog> findByVehicleTypeOrderByMinDistanceKmAsc(String vehicleType);

    List<PricingRateCatalog> findAllByOrderByVehicleTypeAscMinDistanceKmAsc();

    List<PricingRateCatalog> findAllByOrderByVehicleTypeAscMinDistanceKmAsc(Pageable pageable);
}
