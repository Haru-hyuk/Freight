package com.freight.backend.gpsload.tracking.repository;

import com.freight.backend.gpsload.tracking.entity.GpsLog;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

public interface GpsLogRepository extends JpaRepository<GpsLog, Long> {
    Optional<GpsLog> findTopByMatchIdOrderByLoggedAtDesc(Long matchId);
    List<GpsLog> findTop100ByMatchIdOrderByLoggedAtDesc(Long matchId);
    List<GpsLog> findByMatchIdOrderByLoggedAtDesc(Long matchId, Pageable pageable);
    List<GpsLog> findByMatchIdAndLoggedAtAfterOrderByLoggedAtDesc(Long matchId, LocalDateTime since);
    List<GpsLog> findByMatchIdOrderByLoggedAtDesc(Long matchId);
}
