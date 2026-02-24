package com.freight.backend.gpsmiss.loadplan.model;

/**
 * 화물 취급 속성 Enum
 * React Expo 앱에서 사용
 */
public enum CargoHandling {
    /** 파손주의: 위에 무거운 화물 적재 금지 */
    FRAGILE("파손주의"),

    /** 세워서 적재: 회전 불가, 높이 축 고정 */
    UPRIGHT("세워서 적재"),

    /** 습기주의/방수: 물기 있는 화물과 분리 */
    KEEP_DRY("습기주의"),

    /** 충격주의: 충격에 민감, 안전한 위치 배치 */
    EASY_BREAK("충격주의");

    private final String displayName;

    CargoHandling(String displayName) {
        this.displayName = displayName;
    }

    public String getDisplayName() {
        return displayName;
    }
}
