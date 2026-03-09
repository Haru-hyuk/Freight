package com.freight.backend.repository;

import com.freight.backend.entity.QuoteItem;
import java.util.Collection;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface QuoteItemRepository extends JpaRepository<QuoteItem, Long> {
    List<QuoteItem> findByQuoteId(Long quoteId);
    List<QuoteItem> findByQuoteIdIn(Collection<Long> quoteIds);
    void deleteByQuoteId(Long quoteId);

    @Query("""
            select coalesce(sum(case when qi.quantity is null or qi.quantity < 1 then 1 else qi.quantity end), 0)
              from QuoteItem qi
             where qi.quoteId = :quoteId
            """)
    Long sumEffectiveQuantityByQuoteId(@Param("quoteId") Long quoteId);

    @Query("""
            select qi.quoteId as quoteId,
                   coalesce(sum(case when qi.quantity is null or qi.quantity < 1 then 1 else qi.quantity end), 0) as totalQuantity
              from QuoteItem qi
             where qi.quoteId in :quoteIds
             group by qi.quoteId
            """)
    List<QuoteItemQuantityProjection> sumEffectiveQuantityByQuoteIdIn(@Param("quoteIds") Collection<Long> quoteIds);

    interface QuoteItemQuantityProjection {
        Long getQuoteId();
        Long getTotalQuantity();
    }
}
