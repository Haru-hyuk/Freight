package com.freight.backend.repository;

import com.freight.backend.entity.Match;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.domain.Pageable;
import org.springframework.data.repository.query.Param;

public interface MatchRepository extends JpaRepository<Match, Long> {

    Optional<Match> findByQuoteId(Long quoteId);

    List<Match> findByAcceptedFalseAndStatus(Match.Status status);

    @Query("""
            SELECT m
            FROM Match m
            JOIN Quote q ON q.quoteId = m.quoteId
            WHERE m.accepted = false
              AND m.status = :status
              AND q.status = 'OPEN'
              AND (COALESCE(q.deliveryDeadline, q.deliverySchedule) IS NULL
                   OR COALESCE(q.deliveryDeadline, q.deliverySchedule) >= :now)
            ORDER BY m.updatedAt DESC
            """)
    List<Match> findOpenMatchesForMarket(
            @Param("status") Match.Status status,
            @Param("now") LocalDateTime now
    );

    List<Match> findByDriverId(Long driverId);

    List<Match> findByDriverIdAndStatus(Long driverId, Match.Status status);

    List<Match> findByDriverIdAndStatusNot(Long driverId, Match.Status status);

    List<Match> findAllByQuoteId(Long quoteId);

    List<Match> findByAcceptedTrueAndStatusAndAcceptedAtBefore(Match.Status status, LocalDateTime acceptedAt);

    List<Match> findByStatus(Match.Status status);

    List<Match> findByDriverIdIsNotNullAndStatusIn(List<Match.Status> statuses);

    long countByStatus(Match.Status status);

    Optional<Match> findByMatchIdAndDriverId(Long matchId, Long driverId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT m FROM Match m WHERE m.matchId = :matchId")
    Optional<Match> findByIdForUpdate(@Param("matchId") Long matchId);

    boolean existsByQuoteIdAndStatusNot(Long quoteId, Match.Status status);

    @Query("SELECT m FROM Match m WHERE m.quoteId IN (SELECT q.quoteId FROM Quote q WHERE q.shipperId = :shipperId) AND m.status <> 'CANCELLED'")
    List<Match> findByShipperIdAndStatusNotCancelled(@Param("shipperId") Long shipperId);

    @Query("SELECT m FROM Match m WHERE m.matchId = :matchId AND m.quoteId IN (SELECT q.quoteId FROM Quote q WHERE q.shipperId = :shipperId)")
    Optional<Match> findByMatchIdAndShipperId(@Param("matchId") Long matchId, @Param("shipperId") Long shipperId);

    @Query("""
            SELECT q.shipperId, COUNT(m)
            FROM Match m, Quote q
            WHERE m.quoteId = q.quoteId
              AND q.shipperId IN :shipperIds
              AND m.status <> 'CANCELLED'
            GROUP BY q.shipperId
            """)
    List<Object[]> countByShipperIdsNotCancelled(@Param("shipperIds") List<Long> shipperIds);

    @Query("""
            SELECT m.driverId, COUNT(m)
            FROM Match m
            WHERE m.driverId IN :driverIds
            GROUP BY m.driverId
            """)
    List<Object[]> countByDriverIds(@Param("driverIds") List<Long> driverIds);

    @Query("SELECT COUNT(m) FROM Match m WHERE m.status <> 'CANCELLED'")
    long countNonCancelled();

    @Query("SELECT COUNT(m) FROM Match m WHERE m.status = 'COMPLETED' AND m.driverId IS NOT NULL")
    long countDriverCompleted();

    @Query("SELECT m FROM Match m ORDER BY m.updatedAt DESC")
    List<Match> findRecentMatches(Pageable pageable);

    List<Match> findByQuoteIdIn(List<Long> quoteIds);

    /** DB 레벨 상태 필터링 + 페이지네이션 (Admin 배차 관리용) */
    @Query("SELECT m FROM Match m WHERE (:status IS NULL OR m.status = :status) ORDER BY m.updatedAt DESC")
    List<Match> findByStatusFiltered(@Param("status") Match.Status status, Pageable pageable);

    /** DB 레벨 상태별 카운트 */
    @Query("SELECT COUNT(m) FROM Match m WHERE (:status IS NULL OR m.status = :status)")
    long countByStatusFiltered(@Param("status") Match.Status status);

    /** 수락 상태 필터 (배정/미배정) */
    @Query("SELECT m FROM Match m WHERE (:accepted IS NULL OR m.accepted = :accepted) AND (:status IS NULL OR m.status = :status) ORDER BY m.updatedAt DESC")
    List<Match> findByAcceptedAndStatusFiltered(
            @Param("accepted") Boolean accepted,
            @Param("status") Match.Status status,
            Pageable pageable
    );

    @Query("SELECT COUNT(m) FROM Match m WHERE (:accepted IS NULL OR m.accepted = :accepted) AND (:status IS NULL OR m.status = :status)")
    long countByAcceptedAndStatusFiltered(@Param("accepted") Boolean accepted, @Param("status") Match.Status status);

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("""
            update Match m
               set m.version = 0
             where m.matchId = :matchId
               and m.version is null
            """)
    int initializeVersionIfNull(@Param("matchId") Long matchId);

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("""
            update Match m
               set m.driverId = :driverId,
                   m.accepted = true,
                   m.acceptedAt = :acceptedAt
             where m.matchId = :matchId
               and m.accepted = false
               and m.status = com.freight.backend.entity.Match$Status.READY
            """)
    int acceptIfAvailable(
            @Param("matchId") Long matchId,
            @Param("driverId") Long driverId,
            @Param("acceptedAt") LocalDateTime acceptedAt
    );

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("""
            update Match m
               set m.matchGroupKey = :groupKey,
                   m.matchGroupType = :groupType,
                   m.matchGroupOrder = :groupOrder,
                   m.updatedAt = :updatedAt
             where m.matchId = :matchId
            """)
    int assignGroupMetadata(
            @Param("matchId") Long matchId,
            @Param("groupKey") String groupKey,
            @Param("groupType") String groupType,
            @Param("groupOrder") Integer groupOrder,
            @Param("updatedAt") LocalDateTime updatedAt
    );
}
