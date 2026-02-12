package com.freight.backend.repository;

import com.freight.backend.pricing.SurchargeOptionVehicleRate;
import java.util.Collection;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface SurchargeOptionVehicleRateRepository extends JpaRepository<SurchargeOptionVehicleRate, Long> {
    List<SurchargeOptionVehicleRate> findByOption_IdIn(Collection<Long> optionIds);
}
