package com.freight.backend.gpsload.loadplan.repository;

import com.freight.backend.gpsload.loadplan.entity.LoadPlan;
import org.springframework.data.jpa.repository.JpaRepository;

public interface LoadPlanRepository extends JpaRepository<LoadPlan, Long> {
}
