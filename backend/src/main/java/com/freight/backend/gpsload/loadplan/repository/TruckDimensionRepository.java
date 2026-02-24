package com.freight.backend.gpsmiss.loadplan.repository;

import com.freight.backend.gpsmiss.loadplan.entity.TruckDimension;
import org.springframework.data.jpa.repository.JpaRepository;

public interface TruckDimensionRepository extends JpaRepository<TruckDimension, Long> {
}
