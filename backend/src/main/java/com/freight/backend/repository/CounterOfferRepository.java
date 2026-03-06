package com.freight.backend.repository;

import com.freight.backend.entity.CounterOffer;
import java.time.LocalDateTime;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface CounterOfferRepository extends JpaRepository<CounterOffer, Long> {
    List<CounterOffer> findByQuoteIdOrderByCreatedAtDesc(Long quoteId);

    List<CounterOffer> findByDriverIdOrderByCreatedAtDesc(Long driverId);

    boolean existsByQuoteIdAndDriverIdAndStatus(Long quoteId, Long driverId, CounterOffer.Status status);

    void deleteByQuoteId(Long quoteId);

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("""
            update CounterOffer c
               set c.status = :nextStatus,
                   c.respondedAt = :respondedAt
             where c.counterOfferId = :offerId
               and c.status = :expectedStatus
            """)
    int updateStatusIfCurrent(
            @Param("offerId") Long offerId,
            @Param("expectedStatus") CounterOffer.Status expectedStatus,
            @Param("nextStatus") CounterOffer.Status nextStatus,
            @Param("respondedAt") LocalDateTime respondedAt
    );
}
