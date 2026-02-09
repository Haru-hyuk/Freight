package com.freight.backend.repository;

import com.freight.backend.entity.Quote;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface QuoteRepository extends JpaRepository<Quote, Long> {
    List<Quote> findByShipperId(Long shipperId);
}
