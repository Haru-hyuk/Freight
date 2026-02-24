package com.freight.backend.gpsmiss.loadplan.repository;

import com.freight.backend.gpsmiss.loadplan.entity.TruckSpecCatalog;
import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

/**
 * 화물차 표준 제원 기준 조회/업서트용 Repository.
 */
public interface TruckSpecCatalogRepository extends JpaRepository<TruckSpecCatalog, Long> {

    // 톤수 + 차체 타입 기준 조회 (기존 호환 로직용)
    Optional<TruckSpecCatalog> findByTonnageAndVehicleBodyType(BigDecimal tonnage, String vehicleBodyType);

    // 표준키(차종 + 차체 타입) 기준 조회 (업서트 기본 키)
    Optional<TruckSpecCatalog> findByVehicleTypeAndVehicleBodyType(String vehicleType, String vehicleBodyType);

    // 특정 차종의 모든 차체 타입 기준표 조회
    List<TruckSpecCatalog> findByVehicleTypeOrderByVehicleBodyTypeAsc(String vehicleType);

    // 전체 기준표 조회 (차종/차체 정렬)
    List<TruckSpecCatalog> findAllByOrderByVehicleTypeAscVehicleBodyTypeAsc();
}
