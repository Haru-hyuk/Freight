package com.freight.backend.repository;

import com.freight.backend.entity.Settlement;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import jakarta.persistence.LockModeType;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface SettlementRepository extends JpaRepository<Settlement, Long> {

    Optional<Settlement> findByMatchId(Long matchId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT s FROM Settlement s WHERE s.matchId = :matchId")
    Optional<Settlement> findByMatchIdForUpdate(@Param("matchId") Long matchId);

    List<Settlement> findByMatchIdIn(List<Long> matchIds);

    List<Settlement> findByDriverId(Long driverId);

    List<Settlement> findByShipperId(Long shipperId);

    long countByDriverId(Long driverId);

    long countByDriverIdAndSettlementStatus(Long driverId, Settlement.SettlementStatus status);

    List<Settlement> findBySettlementStatus(Settlement.SettlementStatus status);

    List<Settlement> findBySettlementStatusNot(Settlement.SettlementStatus status);

    @Query("""
            SELECT s
            FROM Settlement s
            WHERE s.settlementStatus = :status OR s.settlementStatus IS NULL
            ORDER BY s.createdAt DESC
            """)
    List<Settlement> findPendingOrNullBySettlementStatus(@Param("status") Settlement.SettlementStatus status);

    @Query("""
            SELECT s
            FROM Settlement s
            WHERE s.settlementStatus = :status OR s.settlementStatus IS NULL
            ORDER BY s.createdAt DESC
            """)
    List<Settlement> findPendingOrNullBySettlementStatus(
            @Param("status") Settlement.SettlementStatus status,
            Pageable pageable
    );

    @Query("""
            SELECT s
            FROM Settlement s
            WHERE s.settlementStatus IS NOT NULL AND s.settlementStatus <> :status
            ORDER BY s.createdAt DESC
            """)
    List<Settlement> findNotStatusOrderByCreatedAtDesc(@Param("status") Settlement.SettlementStatus status);

    @Query("""
            SELECT s
            FROM Settlement s
            WHERE s.settlementStatus IS NOT NULL AND s.settlementStatus <> :status
            ORDER BY s.createdAt DESC
            """)
    List<Settlement> findNotStatusOrderByCreatedAtDesc(
            @Param("status") Settlement.SettlementStatus status,
            Pageable pageable
    );

    @Query("""
            SELECT COALESCE(SUM(s.driverPayout), 0)
            FROM Settlement s
            WHERE s.driverId = :driverId
            """)
    BigDecimal sumDriverPayoutByDriverId(@Param("driverId") Long driverId);

    @Query("""
            SELECT COALESCE(SUM(s.driverPayout), 0)
            FROM Settlement s
            WHERE s.driverId = :driverId
              AND s.settlementStatus = :status
            """)
    BigDecimal sumDriverPayoutByDriverIdAndSettlementStatus(
            @Param("driverId") Long driverId,
            @Param("status") Settlement.SettlementStatus status
    );

    @Query("""
            SELECT COALESCE(SUM(s.driverPayout), 0)
            FROM Settlement s
            WHERE s.driverId = :driverId
              AND s.createdAt >= :from
            """)
    BigDecimal sumDriverPayoutByDriverIdAndCreatedAtAfter(
            @Param("driverId") Long driverId,
            @Param("from") LocalDateTime from
    );

    @Query("""
            SELECT COALESCE(SUM(s.driverPayout), 0)
            FROM Settlement s
            WHERE s.driverId = :driverId
              AND s.settlementStatus = :status
              AND s.completedAt IS NOT NULL
              AND s.completedAt >= :from
            """)
    BigDecimal sumDriverPayoutByDriverIdAndStatusAndCompletedAtAfter(
            @Param("driverId") Long driverId,
            @Param("status") Settlement.SettlementStatus status,
            @Param("from") LocalDateTime from
    );

    @Query("""
            SELECT COUNT(s)
            FROM Settlement s
            WHERE s.driverId = :driverId
              AND s.settlementStatus = :status
              AND s.completedAt IS NOT NULL
              AND s.completedAt >= :from
            """)
    long countByDriverIdAndStatusAndCompletedAtAfter(
            @Param("driverId") Long driverId,
            @Param("status") Settlement.SettlementStatus status,
            @Param("from") LocalDateTime from
    );

    List<Settlement> findByDriverIdAndSettlementStatus(Long driverId, Settlement.SettlementStatus status);

    boolean existsByMatchId(Long matchId);
}
