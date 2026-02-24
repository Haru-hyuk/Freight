package com.freight.backend.repository;

import com.freight.backend.entity.Quote;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface QuoteRepository extends JpaRepository<Quote, Long> {
    List<Quote> findByStatus(String status);
    List<Quote> findByShipperId(Long shipperId);

    Optional<Quote> findByPublicId(UUID publicId);
}
