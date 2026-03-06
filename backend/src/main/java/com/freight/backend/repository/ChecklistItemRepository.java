package com.freight.backend.repository;

import com.freight.backend.entity.ChecklistItem;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ChecklistItemRepository extends JpaRepository<ChecklistItem, Long> {
    List<ChecklistItem> findByEnabledTrueOrderBySortOrderAsc();

    Optional<ChecklistItem> findTopByCategoryAndNameOrderByChecklistItemIdAsc(String category, String name);

    List<ChecklistItem> findByCategoryAndEnabledTrueOrderBySortOrderAsc(String category);

    boolean existsByCategoryAndNameIgnoreCaseAndEnabledTrue(String category, String name);

    Optional<ChecklistItem> findFirstByCategoryAndNameIgnoreCase(String category, String name);
}
