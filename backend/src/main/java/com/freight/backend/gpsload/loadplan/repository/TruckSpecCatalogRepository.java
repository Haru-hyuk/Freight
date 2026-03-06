package com.freight.backend.gpsload.loadplan.repository;

import com.freight.backend.gpsload.loadplan.entity.TruckSpecCatalog;
import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

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

    // 전체 기준표 조회 (차종/차체 정렬 + 페이지 제한)
    List<TruckSpecCatalog> findAllByOrderByVehicleTypeAscVehicleBodyTypeAsc(Pageable pageable);

    // 대소문자 무시 vehicle_type 기준 canonical 코드 조회
    @Query("""
            select distinct t.vehicleType
            from TruckSpecCatalog t
            where upper(t.vehicleType) = upper(:vehicleType)
            order by t.vehicleType asc
            """)
    List<String> findCanonicalVehicleTypes(@Param("vehicleType") String vehicleType);

    // underscore 제거 후(예: TON_1_4 -> TON14) legacy code 매칭 조회
    @Query("""
            select distinct t.vehicleType
            from TruckSpecCatalog t
            where upper(replace(t.vehicleType, '_', '')) = upper(:compactVehicleType)
            order by t.vehicleType asc
            """)
    List<String> findCanonicalVehicleTypesByCompactCode(@Param("compactVehicleType") String compactVehicleType);

    // vehicle_type 기준 톤수 조회 (알고리즘 호환)
    @Query("""
            select distinct t.tonnage
            from TruckSpecCatalog t
            where upper(t.vehicleType) = upper(:vehicleType)
              and t.tonnage is not null
            order by t.tonnage asc
            """)
    List<BigDecimal> findTonnagesByVehicleType(@Param("vehicleType") String vehicleType);

    // compact legacy code 기준 톤수 조회 (알고리즘 호환)
    @Query("""
            select distinct t.tonnage
            from TruckSpecCatalog t
            where upper(replace(t.vehicleType, '_', '')) = upper(:compactVehicleType)
              and t.tonnage is not null
            order by t.tonnage asc
            """)
    List<BigDecimal> findTonnagesByCompactVehicleType(@Param("compactVehicleType") String compactVehicleType);
}
