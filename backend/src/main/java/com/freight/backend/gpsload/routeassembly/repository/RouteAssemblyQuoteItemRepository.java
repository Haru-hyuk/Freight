package com.freight.backend.gpsload.routeassembly.repository;

import com.freight.backend.gpsload.routeassembly.entity.QuoteItemEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface RouteAssemblyQuoteItemRepository extends JpaRepository<QuoteItemEntity, Long> {
    List<QuoteItemEntity> findByQuoteIdOrderBySortOrderAsc(Long quoteId);
}
