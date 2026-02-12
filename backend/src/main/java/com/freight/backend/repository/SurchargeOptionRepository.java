package com.freight.backend.repository;

import com.freight.backend.pricing.SurchargeOptionEntity;
import java.util.Collection;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface SurchargeOptionRepository extends JpaRepository<SurchargeOptionEntity, Long> {
    List<SurchargeOptionEntity> findByCodeInAndEnabledTrue(Collection<String> codes);
}
