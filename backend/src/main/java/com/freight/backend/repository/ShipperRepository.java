package com.freight.backend.repository;

import com.freight.backend.entity.Shipper;
import java.time.LocalDateTime;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ShipperRepository extends JpaRepository<Shipper, Long> {

    Optional<Shipper> findByEmail(String email);

    Optional<Shipper> findFirstByOrderByShipperIdAsc();

    long countByCreatedAtAfter(LocalDateTime after);
}
