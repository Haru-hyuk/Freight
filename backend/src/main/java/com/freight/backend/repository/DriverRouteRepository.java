package com.freight.backend.repository;

import com.freight.backend.entity.DriverRoute;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface DriverRouteRepository extends JpaRepository<DriverRoute, Long> {

    List<DriverRoute> findByDriverIdOrderByCreatedAtDesc(Long driverId);

    List<DriverRoute> findByStatusOrderByCreatedAtDesc(String status);
}
