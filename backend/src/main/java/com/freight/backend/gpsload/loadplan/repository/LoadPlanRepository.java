package com.freight.backend.gpsmiss.loadplan.repository;

import com.freight.backend.gpsmiss.loadplan.entity.LoadPlan;
import org.springframework.data.jpa.repository.JpaRepository;

public interface LoadPlanRepository extends JpaRepository<LoadPlan, Long> {
}
