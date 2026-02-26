package com.freight.backend.gpsload.gps.repository;

import com.freight.backend.gpsload.gps.entity.GpsLog;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

/**
 * GPS 로그 Repository
 */
public interface GpsTrackingLogRepository extends JpaRepository<GpsLog, Long> {

    /**
     * 특정 매칭의 최신 GPS 로그 조회
     */
    Optional<GpsLog> findTopByMatchIdOrderByLoggedAtDesc(Long matchId);

    /**
     * 특정 매칭의 GPS 이력 조회 (최신순, 개수 제한)
     */
    List<GpsLog> findByMatchIdOrderByLoggedAtDesc(Long matchId);

    /**
     * 특정 매칭의 GPS 이력 조회 (시간 이후, 최신순)
     */
    List<GpsLog> findByMatchIdAndLoggedAtAfterOrderByLoggedAtDesc(
            Long matchId, LocalDateTime since);

    /**
     * 특정 매칭의 최근 N건 GPS 로그 조회
     */
    @Query(value = """
            SELECT * FROM gps_logs
            WHERE match_id = :matchId
            ORDER BY logged_at DESC
            """, nativeQuery = true)
    List<GpsLog> findRecentByMatchId(
            @Param("matchId") Long matchId,
            Pageable pageable);

    /**
     * 특정 매칭의 이탈 로그만 조회
     */
    List<GpsLog> findByMatchIdAndIsDeviationTrueOrderByLoggedAtDesc(Long matchId);
}
