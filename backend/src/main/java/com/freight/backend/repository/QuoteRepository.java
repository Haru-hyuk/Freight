package com.freight.backend.repository;

import com.freight.backend.entity.Quote;
import com.freight.backend.entity.Match;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface QuoteRepository extends JpaRepository<Quote, Long> {
    List<Quote> findByStatus(String status);
    List<Quote> findByQuoteIdInAndStatus(List<Long> quoteIds, String status);
    List<Quote> findByShipperId(Long shipperId);

    Optional<Quote> findByPublicId(UUID publicId);

    // 대시보드 성능 최적화 쿼리
    long countByCreatedAtAfter(LocalDateTime after);

    @Query("SELECT COUNT(q) FROM Quote q WHERE q.status = :status")
    long countByStatus(@Param("status") String status);

    @Query("SELECT COALESCE(SUM(q.finalPrice), 0) FROM Quote q WHERE q.finalPrice > 0")
    long sumFinalPrice();

    @Query("""
            SELECT COALESCE(SUM(q.finalPrice), 0)
            FROM Quote q
            WHERE q.finalPrice > 0
              AND NOT EXISTS (
                  SELECT m.matchId
                  FROM Match m
                  WHERE m.quoteId = q.quoteId
                    AND m.status = :completedStatus
              )
            """)
    long sumUnsettledFinalPrice(@Param("completedStatus") Match.Status completedStatus);

    @Query("""
            SELECT q.shipperId, COUNT(q)
            FROM Quote q
            WHERE q.shipperId IN :shipperIds
            GROUP BY q.shipperId
            """)
    List<Object[]> countByShipperIds(@Param("shipperIds") List<Long> shipperIds);

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("""
            update Quote q
               set q.status = :nextStatus,
                   q.updatedAt = :updatedAt
             where q.quoteId = :quoteId
               and q.status = :expectedStatus
            """)
    int updateStatusIfCurrent(
            @Param("quoteId") Long quoteId,
            @Param("expectedStatus") String expectedStatus,
            @Param("nextStatus") String nextStatus,
            @Param("updatedAt") LocalDateTime updatedAt
    );

    @Query("""
            SELECT q
            FROM Quote q
            WHERE q.status = :status
              AND q.originLat IS NOT NULL
              AND q.originLng IS NOT NULL
              AND q.destinationLat IS NOT NULL
              AND q.destinationLng IS NOT NULL
              AND q.originLat BETWEEN :minLat AND :maxLat
              AND q.originLng BETWEEN :minLng AND :maxLng
            ORDER BY q.createdAt DESC
            """)
    List<Quote> findOpenCandidatesByOriginBoundingBox(
            @Param("status") String status,
            @Param("minLat") double minLat,
            @Param("maxLat") double maxLat,
            @Param("minLng") double minLng,
            @Param("maxLng") double maxLng,
            Pageable pageable
    );
}
