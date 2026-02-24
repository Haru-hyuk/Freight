package com.freight.backend.gpsmiss.loadplan.model;

/**
 * 차량 적재함 타입 Enum
 * schema.sql: ENUM('cargo','wingbody','top')
 */
public enum VehicleBodyType {
    /** 카고: 일반 적재함, 후문(rear) */
    CARGO("카고", "rear"),

    /** 윙바디: 측면 개방, 측문(side) */
    WINGBODY("윙바디", "side"),

    /** 탑차: 냉동/냉장, 후문(rear) */
    TOP("탑차", "rear");

    private final String displayName;
    private final String doorPosition;

    VehicleBodyType(String displayName, String doorPosition) {
        this.displayName = displayName;
        this.doorPosition = doorPosition;
    }

    public String getDisplayName() {
        return displayName;
    }

    /**
     * 문 위치: rear(후문), side(측문)
     */
    public String getDoorPosition() {
        return doorPosition;
    }
}
