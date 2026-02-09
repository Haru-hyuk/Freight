package com.freight.backend.repository;

import com.freight.backend.entity.QuoteChecklistItem;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface QuoteChecklistItemRepository extends JpaRepository<QuoteChecklistItem, Long> {
    List<QuoteChecklistItem> findByQuoteId(Long quoteId);
    void deleteByQuoteId(Long quoteId);
}
