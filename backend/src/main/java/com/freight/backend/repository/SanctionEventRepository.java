package com.freight.backend.repository;

import com.freight.backend.entity.SanctionEvent;
import java.util.List;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

public interface SanctionEventRepository extends JpaRepository<SanctionEvent, Long> {
    List<SanctionEvent> findAllByOrderByCreatedAtDesc();

    List<SanctionEvent> findAllByOrderByCreatedAtDesc(Pageable pageable);
}
