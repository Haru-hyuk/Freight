package com.freight.backend.gpsmiss.loadplan.model;

import com.fasterxml.jackson.annotation.JsonAlias;

import java.util.List;

/**
 * 화물 아이템 모델
 * React Expo 앱에서 사용하기 좋은 구조
 */
public record CargoItem(
        /** 화물 ID */
        String id,

        /** 길이 (cm) */
        int length,

        /** 너비 (cm) */
        int width,

        /** 높이 (cm) */
        int height,

        /** 무게 (kg) */
        double weight,

        /** 하차 순서 (LIFO 적용) */
        @JsonAlias({"stop_index", "stopIndex"})
        Integer stopOrder,

        /** 회전 가능 여부 (기본: true) */
        Boolean rotatable,

        /** 위에 적재 가능 여부 (기본: true) */
        Boolean stackable,

        /** 파손주의: 위에 무거운 화물 적재 금지 */
        Boolean fragile,

        /** 적재불가: 위에 아무것도 못 올림, 최상단에만 배치 */
        Boolean noStack,

        /** 바닥전용: y=0에만 배치 */
        Boolean bottomOnly,

        /** 최대 적재 허용 무게(kg). 이 화물 위에 올 수 있는 총 무게 한도 */
        Double maxStackWeight,

        /** 화물 취급 속성 목록 (FRAGILE, UPRIGHT, KEEP_DRY, EASY_BREAK) */
        List<CargoHandling> handling
) {
    /**
     * handling 목록에서 속성 파생
     */
    public boolean isFragileFromHandling() {
        // FRAGILE만 체크 (파손주의 - 벽 밀착 선호, 상부 적재 제한적 허용)
        return handling != null && handling.contains(CargoHandling.FRAGILE);
    }

    /**
     * EASY_BREAK 여부 (충격주의 - 벽 밀착 회피, 상부 적재 금지)
     */
    public boolean isEasyBreakFromHandling() {
        return handling != null && handling.contains(CargoHandling.EASY_BREAK);
    }

    /**
     * FRAGILE 또는 EASY_BREAK 중 하나라도 해당하면 취약 화물로 분류
     */
    public boolean isVulnerableFromHandling() {
        return handling != null && (
                handling.contains(CargoHandling.FRAGILE) ||
                handling.contains(CargoHandling.EASY_BREAK));
    }

    public boolean isUprightFromHandling() {
        return handling != null && handling.contains(CargoHandling.UPRIGHT);
    }

    public boolean requiresKeepDry() {
        return handling != null && handling.contains(CargoHandling.KEEP_DRY);
    }
}
