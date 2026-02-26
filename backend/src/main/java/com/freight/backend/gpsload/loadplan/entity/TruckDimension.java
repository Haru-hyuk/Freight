package com.freight.backend.gpsload.loadplan.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * 기사 트럭 엔티티 — 팀 합의 DDL (trucks 테이블).
 * cargo_length, cargo_width, cargo_height(cm), max_weight(kg), max_volume(CBM) 포함.
 * door_position은 이 테이블에 없음 → truck_spec_catalog 조회 또는 vehicle_body_type 보정.
 */
@Entity
@Table(name = "trucks")
public class TruckDimension {

    @Id
    @Column(name = "truck_id", nullable = false)
    private Long truckId;

    @Column(name = "driver_id", nullable = false)
    private Long driverId;

    @Column(name = "vehicle_type")
    private String vehicleType;

    @Column(name = "vehicle_body_type")
    private String vehicleBodyType;

    @Column(name = "vehicle_option")
    private String vehicleOption;

    @Column(name = "tonnage")
    private BigDecimal tonnage;

    @Column(name = "max_weight")
    private BigDecimal maxWeight;

    @Column(name = "max_volume")
    private BigDecimal maxVolume;

    @Column(name = "name")
    private String name;

    @Column(name = "image_url")
    private String imageUrl;

    @Column(name = "approved", nullable = false)
    private Boolean approved;

    @Column(name = "insurance")
    private String insurance;

    @Column(name = "odometer_km")
    private BigDecimal odometerKm;

    @Column(name = "last_inspection_date")
    private LocalDate lastInspectionDate;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @Column(name = "cargo_length")
    private BigDecimal cargoLength;

    @Column(name = "cargo_width")
    private BigDecimal cargoWidth;

    @Column(name = "cargo_height")
    private BigDecimal cargoHeight;

    protected TruckDimension() {
    }

    // ========== Getter ==========

    public Long getTruckId() {
        return truckId;
    }

    public Long getDriverId() {
        return driverId;
    }

    public String getVehicleType() {
        return vehicleType;
    }

    public String getVehicleBodyType() {
        return vehicleBodyType;
    }

    public String getVehicleOption() {
        return vehicleOption;
    }

    public BigDecimal getTonnage() {
        return tonnage;
    }

    public BigDecimal getMaxWeight() {
        return maxWeight;
    }

    public BigDecimal getMaxVolume() {
        return maxVolume;
    }

    /**
     * cargo_length (cm) → int 변환 (3D 적재용)
     */
    public Integer getLength() {
        return cargoLength != null ? cargoLength.intValue() : null;
    }

    /**
     * cargo_width (cm) → int 변환 (3D 적재용)
     */
    public Integer getWidth() {
        return cargoWidth != null ? cargoWidth.intValue() : null;
    }

    /**
     * cargo_height (cm) → int 변환 (3D 적재용)
     */
    public Integer getHeight() {
        return cargoHeight != null ? cargoHeight.intValue() : null;
    }

    /**
     * max_weight (kg) → double 변환
     */
    public Double getMaxWeightKg() {
        return maxWeight != null ? maxWeight.doubleValue() : null;
    }

    /**
     * door_position은 trucks 테이블에 없음.
     * vehicle_body_type 보정으로 반환: cargo→rear, wingbody→side, top→rear
     */
    public String getDoorPosition() {
        return resolveDoorPositionFromBodyType(vehicleBodyType);
    }

    /**
     * vehicle_body_type → door_position 보정
     * 차량 형식에 따른 기본 문 위치:
     * - wingbody (윙바디): side_both (양쪽 측면 개방)
     * - cargo (카고): rear (후방 문)
     * - top (탑차): rear (후방 문, 높이 제약 있음)
     * - flat (평판): top (상단 개방, 크레인 하역)
     * - refrigerated (냉동/냉장): rear (후방 문)
     */
    public static String resolveDoorPositionFromBodyType(String bodyType) {
        if (bodyType == null || bodyType.isBlank()) return "rear";

        String normalized = bodyType.toLowerCase().trim()
                .replace(" ", "").replace("_", "").replace("-", "");

        return switch (normalized) {
            case "wingbody", "wing" -> "side_both";
            case "flat", "flatbed", "평판" -> "top";
            case "cargo", "카고", "일반" -> "rear";
            case "top", "탑차", "탑" -> "rear";
            case "refrigerated", "냉동", "냉장" -> "rear";
            default -> "rear";
        };
    }

    /**
     * 차량 형식별 적재 특성 반환
     * - STANDARD: 일반 적재 (카고, 탑차)
     * - SIDE_LOADING: 측면 적재 (윙바디)
     * - TOP_LOADING: 상단 적재 (평판)
     * - HEIGHT_LIMITED: 높이 제약 (탑차)
     */
    public String getLoadingCharacteristic() {
        if (vehicleBodyType == null || vehicleBodyType.isBlank()) return "STANDARD";

        String normalized = vehicleBodyType.toLowerCase().trim()
                .replace(" ", "").replace("_", "").replace("-", "");

        return switch (normalized) {
            case "wingbody", "wing" -> "SIDE_LOADING";
            case "flat", "flatbed", "평판" -> "TOP_LOADING";
            case "top", "탑차", "탑" -> "HEIGHT_LIMITED";
            default -> "STANDARD";
        };
    }
}
