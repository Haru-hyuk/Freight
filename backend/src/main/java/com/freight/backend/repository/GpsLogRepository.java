package com.freight.backend.repository;

import com.freight.backend.entity.GpsLog;
import java.util.List;
import java.util.Optional;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

public interface GpsLogRepository extends JpaRepository<GpsLog, Long> {
    Optional<GpsLog> findTopByMatchIdOrderByLoggedAtDesc(Long matchId);
    List<GpsLog> findTop100ByMatchIdOrderByLoggedAtDesc(Long matchId);
    List<GpsLog> findByMatchIdOrderByLoggedAtDesc(Long matchId, Pageable pageable);
}
