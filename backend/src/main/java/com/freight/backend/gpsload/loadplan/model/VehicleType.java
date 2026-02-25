package com.freight.backend.gpsload.loadplan.model;

import java.math.BigDecimal;

/**
 * 차량 종류 Enum
 * truck_specifications.json 기반
 */
public enum VehicleType {
    DAMAS("다마스", new BigDecimal("0.4")),
    LABO("라보", new BigDecimal("0.5")),
    TON_1("1톤", new BigDecimal("1")),
    TON_1_4("1.4톤", new BigDecimal("1.4")),
    TON_2_5("2.5톤", new BigDecimal("2.5")),
    TON_3_5("3.5톤", new BigDecimal("3.5")),
    TON_5("5톤", new BigDecimal("5")),
    TON_5_AXLE("5톤 축차", new BigDecimal("5")),
    TON_8("8톤", new BigDecimal("8")),
    TON_11("11톤", new BigDecimal("11")),
    TON_14("14톤", new BigDecimal("14")),
    TON_15("15톤", new BigDecimal("15")),
    TON_18("18톤", new BigDecimal("18")),
    TON_25("25톤", new BigDecimal("25"));

    private final String displayName;
    private final BigDecimal tonnage;

    VehicleType(String displayName, BigDecimal tonnage) {
        this.displayName = displayName;
        this.tonnage = tonnage;
    }

    public String getDisplayName() {
        return displayName;
    }

    public BigDecimal getTonnage() {
        return tonnage;
    }
}
