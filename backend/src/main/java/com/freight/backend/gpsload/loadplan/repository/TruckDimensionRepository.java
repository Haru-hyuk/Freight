package com.freight.backend.gpsload.loadplan.repository;

import com.freight.backend.gpsload.loadplan.entity.TruckDimension;
import org.springframework.data.jpa.repository.JpaRepository;

public interface TruckDimensionRepository extends JpaRepository<TruckDimension, Long> {
}
