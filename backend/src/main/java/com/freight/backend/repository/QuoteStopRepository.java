package com.freight.backend.repository;

import com.freight.backend.entity.QuoteStop;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface QuoteStopRepository extends JpaRepository<QuoteStop, Long> {
    List<QuoteStop> findByQuoteIdOrderBySeqAsc(Long quoteId);
    List<QuoteStop> findByQuoteIdInOrderByQuoteIdAscSeqAsc(List<Long> quoteIds);
    void deleteByQuoteId(Long quoteId);
}
