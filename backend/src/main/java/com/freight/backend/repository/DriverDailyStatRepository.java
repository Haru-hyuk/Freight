package com.freight.backend.repository;

import com.freight.backend.entity.DriverDailyStat;
import com.freight.backend.entity.DriverDailyStatId;
import java.time.LocalDate;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface DriverDailyStatRepository extends JpaRepository<DriverDailyStat, DriverDailyStatId> {

    List<DriverDailyStat> findByIdDriverIdOrderByIdStatDateDesc(Long driverId);

    List<DriverDailyStat> findByIdDriverIdAndIdStatDateBetweenOrderByIdStatDateDesc(
            Long driverId,
            LocalDate from,
            LocalDate to
    );
}
