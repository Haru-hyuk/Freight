package com.freight.backend.repository;

import com.freight.backend.entity.Truck;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface TruckRepository extends JpaRepository<Truck, Long> {
    List<Truck> findByDriverId(Long driverId);
    List<Truck> findByApprovedFalseOrderByCreatedAtDesc();

    @Query("select coalesce(max(t.truckId), 0) from Truck t")
    Long findMaxTruckId();
}

