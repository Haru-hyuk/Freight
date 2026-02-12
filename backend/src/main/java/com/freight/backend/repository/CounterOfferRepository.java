package com.freight.backend.repository;

import com.freight.backend.entity.CounterOffer;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CounterOfferRepository extends JpaRepository<CounterOffer, Long> {
    List<CounterOffer> findByQuoteIdOrderByCreatedAtDesc(Long quoteId);

    List<CounterOffer> findByDriverIdOrderByCreatedAtDesc(Long driverId);

    boolean existsByQuoteIdAndDriverIdAndStatus(Long quoteId, Long driverId, CounterOffer.Status status);
}
