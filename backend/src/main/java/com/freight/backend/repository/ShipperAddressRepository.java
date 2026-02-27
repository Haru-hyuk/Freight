package com.freight.backend.repository;

import com.freight.backend.entity.ShipperAddress;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface ShipperAddressRepository extends JpaRepository<ShipperAddress, Long> {

    List<ShipperAddress> findByShipperIdOrderByIsDefaultDescUpdatedAtDescCreatedAtDesc(Long shipperId);

    Optional<ShipperAddress> findByShipperAddressIdAndShipperId(Long shipperAddressId, Long shipperId);

    Optional<ShipperAddress> findFirstByShipperIdOrderByUpdatedAtDescCreatedAtDesc(Long shipperId);

    @Modifying
    @Query("update ShipperAddress sa set sa.isDefault = false where sa.shipperId = :shipperId")
    int clearDefaultByShipperId(@Param("shipperId") Long shipperId);
}
