package com.freight.backend.repository;

import com.freight.backend.entity.Truck;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface TruckRepository extends JpaRepository<Truck, Long> {
    List<Truck> findByDriverId(Long driverId);
}
