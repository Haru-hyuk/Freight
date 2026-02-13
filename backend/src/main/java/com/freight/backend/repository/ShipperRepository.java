package com.freight.backend.repository;

import com.freight.backend.entity.Shipper;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ShipperRepository extends JpaRepository<Shipper, Long> {

    Optional<Shipper> findByEmail(String email);
}
