package com.freight.backend.repository;

import com.freight.backend.entity.Match;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface MatchRepository extends JpaRepository<Match, Long> {

    Optional<Match> findByQuoteId(Long quoteId);

    List<Match> findByAcceptedFalseAndStatus(Match.Status status);

    List<Match> findByDriverId(Long driverId);

    List<Match> findByDriverIdAndStatus(Long driverId, Match.Status status);

    List<Match> findByDriverIdAndStatusNot(Long driverId, Match.Status status);

    List<Match> findByAcceptedTrueAndStatusAndAcceptedAtBefore(Match.Status status, LocalDateTime acceptedAt);

    List<Match> findByStatus(Match.Status status);

    Optional<Match> findByMatchIdAndDriverId(Long matchId, Long driverId);

    boolean existsByQuoteIdAndStatusNot(Long quoteId, Match.Status status);

    @Query("SELECT m FROM Match m WHERE m.quoteId IN (SELECT q.quoteId FROM Quote q WHERE q.shipperId = :shipperId) AND m.status <> 'CANCELLED'")
    List<Match> findByShipperIdAndStatusNotCancelled(@Param("shipperId") Long shipperId);

    @Query("SELECT m FROM Match m WHERE m.matchId = :matchId AND m.quoteId IN (SELECT q.quoteId FROM Quote q WHERE q.shipperId = :shipperId)")
    Optional<Match> findByMatchIdAndShipperId(@Param("matchId") Long matchId, @Param("shipperId") Long shipperId);

    List<Match> findByQuoteIdIn(List<Long> quoteIds);

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
}
