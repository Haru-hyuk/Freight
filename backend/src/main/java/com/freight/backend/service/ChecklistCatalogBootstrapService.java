package com.freight.backend.service;

import com.freight.backend.entity.ChecklistItem;
import com.freight.backend.repository.ChecklistItemRepository;
import java.math.BigDecimal;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/**
 * checklist_items 기본값을 서버 시작 시 자동 보정한다.
 * 수동 SQL 실행 없이도 견적 체크리스트 매핑이 비지 않도록 유지한다.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class ChecklistCatalogBootstrapService implements CommandLineRunner {

    private static final String REQUEST_CATEGORY = "REQUEST";

    private final ChecklistItemRepository checklistItemRepository;

    @Value("${catalog.bootstrap.checklist-enabled:true}")
    private boolean checklistBootstrapEnabled;

    @Override
    @Transactional
    public void run(String... args) {
        if (!checklistBootstrapEnabled) {
            log.info("Checklist catalog bootstrap disabled");
            return;
        }

        int inserted = 0;
        inserted += ensureEnabledRow("파손주의", "caution", 5000, 1);
        inserted += ensureEnabledRow("세워서상차", "upright", 3000, 2);
        inserted += ensureEnabledRow("방수/습기주의", "waterproof", 5000, 3);
        inserted += ensureEnabledRow("충격주의", "shock", 5000, 4);

        if (inserted > 0) {
            log.info("checklist_items bootstrap completed: inserted {} rows", inserted);
        } else {
            log.info("checklist_items bootstrap skipped: catalog already ready");
        }
    }

    private int ensureEnabledRow(String name, String icon, int baseFee, int sortOrder) {
        if (checklistItemRepository.existsByCategoryAndNameIgnoreCaseAndEnabledTrue(REQUEST_CATEGORY, name)) {
            return 0;
        }

        ChecklistItem item = ChecklistItem.builder()
                .category(REQUEST_CATEGORY)
                .name(name)
                .icon(icon)
                .hasExtraFee(Boolean.TRUE)
                .baseExtraFee(BigDecimal.valueOf(baseFee))
                .requiresExtraInput(Boolean.FALSE)
                .extraInputLabel(null)
                .sortOrder(sortOrder)
                .enabled(Boolean.TRUE)
                .build();
        checklistItemRepository.save(item);
        return 1;
    }
}
