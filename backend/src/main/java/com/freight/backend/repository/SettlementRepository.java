package com.freight.backend.repository;

import com.freight.backend.entity.Settlement;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface SettlementRepository extends JpaRepository<Settlement, Long> {

    Optional<Settlement> findByMatchId(Long matchId);

    List<Settlement> findByDriverId(Long driverId);

    List<Settlement> findByShipperId(Long shipperId);

    List<Settlement> findBySettlementStatus(Settlement.SettlementStatus status);

    List<Settlement> findByDriverIdAndSettlementStatus(Long driverId, Settlement.SettlementStatus status);

    boolean existsByMatchId(Long matchId);
}
