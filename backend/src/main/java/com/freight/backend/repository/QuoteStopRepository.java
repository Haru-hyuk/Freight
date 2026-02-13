package com.freight.backend.repository;

import com.freight.backend.entity.QuoteStop;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface QuoteStopRepository extends JpaRepository<QuoteStop, Long> {
    List<QuoteStop> findByQuoteIdOrderBySeqAsc(Long quoteId);
    void deleteByQuoteId(Long quoteId);
}
