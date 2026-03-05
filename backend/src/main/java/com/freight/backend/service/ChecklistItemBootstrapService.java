package com.freight.backend.service;

import com.freight.backend.entity.ChecklistItem;
import com.freight.backend.repository.ChecklistItemRepository;
import java.math.BigDecimal;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component
@RequiredArgsConstructor
public class ChecklistItemBootstrapService implements CommandLineRunner {

    private static final Logger log = LoggerFactory.getLogger(ChecklistItemBootstrapService.class);
    private static final String REQUEST_CATEGORY = "REQUEST";

    private final ChecklistItemRepository checklistItemRepository;

    @Value("${catalog.bootstrap.checklist-items.enabled:true}")
    private boolean enabled;

    @Override
    @Transactional
    public void run(String... args) {
        if (!enabled) {
            log.info("Checklist item bootstrap disabled");
            return;
        }

        List<ChecklistSeed> seeds = List.of(
                new ChecklistSeed("파손주의", "alert-circle-outline", fee(5000), 10),
                new ChecklistSeed("세워서 상차", "arrow-up-outline", fee(3000), 20),
                new ChecklistSeed("방수/습기주의", "water-outline", fee(5000), 30),
                new ChecklistSeed("충격주의", "flash-outline", fee(5000), 40)
        );

        int upserted = 0;
        for (ChecklistSeed seed : seeds) {
            upsert(seed);
            upserted++;
        }
        log.info("checklist_items 업서트 완료: {} rows", upserted);
    }

    private void upsert(ChecklistSeed seed) {
        ChecklistItem existing = checklistItemRepository
                .findTopByCategoryAndNameOrderByChecklistItemIdAsc(REQUEST_CATEGORY, seed.name())
                .orElse(null);

        ChecklistItem target = ChecklistItem.builder()
                .checklistItemId(existing != null ? existing.getChecklistItemId() : null)
                .category(REQUEST_CATEGORY)
                .name(seed.name())
                .icon(seed.icon())
                .hasExtraFee(seed.baseExtraFee().compareTo(BigDecimal.ZERO) > 0)
                .baseExtraFee(seed.baseExtraFee())
                .requiresExtraInput(false)
                .extraInputLabel(null)
                .sortOrder(seed.sortOrder())
                .enabled(true)
                .createdAt(existing != null ? existing.getCreatedAt() : null)
                .build();

        checklistItemRepository.save(target);
    }

    private static BigDecimal fee(int value) {
        return BigDecimal.valueOf(value).setScale(2);
    }

    private record ChecklistSeed(
            String name,
            String icon,
            BigDecimal baseExtraFee,
            int sortOrder
    ) {
    }
}
