package com.freight.backend.repository;

import com.freight.backend.entity.ChecklistItem;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ChecklistItemRepository extends JpaRepository<ChecklistItem, Long> {
    List<ChecklistItem> findByEnabledTrueOrderBySortOrderAsc();
}
