package com.freight.backend.service;

import com.freight.backend.entity.ChecklistItem;
import com.freight.backend.gpsload.loadplan.model.CargoHandling;
import org.springframework.stereotype.Component;

import java.util.LinkedHashSet;
import java.util.Locale;
import java.util.Set;

/**
 * 체크리스트 항목을 적재/취급 속성으로 매핑하는 공용 규칙.
 * 문자열 매칭 분산을 줄여 추천/3D 경로 모두 동일한 기준을 사용한다.
 */
@Component
public class ChecklistHandlingMapper {

    public Set<CargoHandling> mapToCargoHandling(ChecklistItem item) {
        if (item == null) {
            return Set.of();
        }
        String source = buildSourceText(item);
        if (source.isBlank()) {
            return Set.of();
        }

        Set<CargoHandling> mapped = new LinkedHashSet<>();
        if (containsAny(source, "파손", "충격", "깨짐", "fragile", "break", "shock")) {
            mapped.add(CargoHandling.FRAGILE);
            if (containsAny(source, "충격", "shock")) {
                mapped.add(CargoHandling.EASY_BREAK);
            }
        }
        if (containsAny(source, "세워", "직립", "upright", "this side up")) {
            mapped.add(CargoHandling.UPRIGHT);
        }
        if (containsAny(source, "방수", "습기", "우천", "keep dry", "waterproof", "dry")) {
            mapped.add(CargoHandling.KEEP_DRY);
        }
        return mapped;
    }

    public Set<String> mapToHandlingTags(ChecklistItem item) {
        Set<CargoHandling> cargoHandling = mapToCargoHandling(item);
        if (cargoHandling.isEmpty()) {
            return Set.of();
        }
        Set<String> tags = new LinkedHashSet<>();
        for (CargoHandling handling : cargoHandling) {
            switch (handling) {
                case FRAGILE -> tags.add("FRAGILE");
                case EASY_BREAK -> tags.add("EASY_BREAK");
                case UPRIGHT -> tags.add("UPRIGHT");
                case KEEP_DRY -> tags.add("KEEP_DRY");
                default -> {
                    // ignore
                }
            }
        }
        return tags;
    }

    private String buildSourceText(ChecklistItem item) {
        StringBuilder sb = new StringBuilder();
        appendLower(sb, item.getCategory());
        appendLower(sb, item.getName());
        appendLower(sb, item.getIcon());
        appendLower(sb, item.getExtraInputLabel());
        return sb.toString();
    }

    private void appendLower(StringBuilder sb, String value) {
        if (value == null || value.isBlank()) {
            return;
        }
        if (!sb.isEmpty()) {
            sb.append(' ');
        }
        sb.append(value.trim().toLowerCase(Locale.ROOT));
    }

    private boolean containsAny(String source, String... tokens) {
        for (String token : tokens) {
            if (token != null && !token.isBlank() && source.contains(token.toLowerCase(Locale.ROOT))) {
                return true;
            }
        }
        return false;
    }
}

