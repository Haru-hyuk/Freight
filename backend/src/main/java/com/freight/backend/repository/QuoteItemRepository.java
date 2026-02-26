package com.freight.backend.repository;

import com.freight.backend.entity.QuoteItem;
import java.util.Collection;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface QuoteItemRepository extends JpaRepository<QuoteItem, Long> {
    List<QuoteItem> findByQuoteId(Long quoteId);
    List<QuoteItem> findByQuoteIdIn(Collection<Long> quoteIds);
    void deleteByQuoteId(Long quoteId);
}
