package com.freight.backend.gpsmiss.loadplan.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * 화물차 표준 제원 기준 테이블(truck_spec_catalog) 매핑 엔티티.
 * 동일 차량 타입 + 차체 타입 조합은 유니크하게 관리한다.
 */
@Entity
@Table(
        name = "truck_spec_catalog",
        uniqueConstraints = {
                @UniqueConstraint(
                        name = "uk_truck_spec_vehicle_body",
                        columnNames = {"vehicle_type", "vehicle_body_type"}
                )
        }
)
public class TruckSpecCatalog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "spec_id")
    private Long specId;

    @Column(name = "vehicle_type", nullable = false)
    private String vehicleType;

    @Column(name = "vehicle_type_kr")
    private String vehicleTypeKr;

    @Column(name = "vehicle_body_type", nullable = false)
    private String vehicleBodyType;

    /**
     * DB 스키마 호환용 차량 모델명.
     * 일부 환경에서는 NOT NULL 제약이 있으므로 부트스트랩 시 반드시 값이 채워져야 한다.
     */
    @Column(name = "vehicle_model")
    private String vehicleModel;

    /**
     * 레거시 스키마 호환용 한글 모델명 컬럼.
     */
    @Column(name = "vehicle_model_kr")
    private String vehicleModelKr;

    @Column(name = "category_kr")
    private String categoryKr;

    @Column(name = "tonnage", nullable = false)
    private BigDecimal tonnage;

    @Column(name = "max_weight", nullable = false)
    private BigDecimal maxWeight;

    @Column(name = "max_weight_display")
    private String maxWeightDisplay;

    @Column(name = "max_volume", nullable = false)
    private BigDecimal maxVolume;

    @Column(name = "cargo_length", nullable = false)
    private BigDecimal cargoLength;

    @Column(name = "cargo_width", nullable = false)
    private BigDecimal cargoWidth;

    @Column(name = "cargo_height", nullable = false)
    private BigDecimal cargoHeight;

    /**
     * 레거시 스키마 호환용(cm 단위) 컬럼들.
     */
    @Column(name = "cargo_length_cm")
    private BigDecimal cargoLengthCmLegacy;

    @Column(name = "cargo_width_cm")
    private BigDecimal cargoWidthCmLegacy;

    @Column(name = "cargo_height_cm")
    private BigDecimal cargoHeightCmLegacy;

    @Column(name = "max_weight_kg")
    private BigDecimal maxWeightKgLegacy;

    @Column(name = "max_volume_cbm")
    private BigDecimal maxVolumeCbmLegacy;

    @Column(name = "pallet_count")
    private Integer palletCount;

    @Column(name = "pallet_standard_mm")
    private String palletStandardMm;

    @Column(name = "pallet_standard")
    private String palletStandard;

    @Column(name = "option_key")
    private String optionKey;

    @Column(name = "door_position")
    private String doorPosition;

    @Column(name = "source_name")
    private String sourceName;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    protected TruckSpecCatalog() {
    }

    /**
     * 기준표 업서트를 위한 최소 키(차종+차체) 생성 팩토리.
     */
    public static TruckSpecCatalog create(String vehicleType, String vehicleBodyType) {
        TruckSpecCatalog spec = new TruckSpecCatalog();
        spec.vehicleType = vehicleType;
        spec.vehicleBodyType = vehicleBodyType;
        return spec;
    }

    /**
     * docs 기준표 값으로 현재 엔티티를 갱신한다.
     * 길이/너비/높이는 cm 기준으로 저장한다.
     */
    public void applyStandardData(
            String vehicleTypeKr,
            String categoryKr,
            String vehicleModel,
            BigDecimal tonnage,
            BigDecimal maxWeight,
            String maxWeightDisplay,
            BigDecimal maxVolume,
            BigDecimal cargoLengthCm,
            BigDecimal cargoWidthCm,
            BigDecimal cargoHeightCm,
            Integer palletCount,
            String palletStandardMm,
            String doorPosition,
            String sourceName
    ) {
        this.vehicleTypeKr = vehicleTypeKr;
        this.categoryKr = categoryKr;
        this.vehicleModel = vehicleModel;
        this.vehicleModelKr = vehicleTypeKr;
        this.tonnage = tonnage;
        this.maxWeight = maxWeight;
        this.maxWeightDisplay = maxWeightDisplay;
        this.maxVolume = maxVolume;
        this.cargoLength = cargoLengthCm;
        this.cargoWidth = cargoWidthCm;
        this.cargoHeight = cargoHeightCm;
        this.cargoLengthCmLegacy = cargoLengthCm;
        this.cargoWidthCmLegacy = cargoWidthCm;
        this.cargoHeightCmLegacy = cargoHeightCm;
        this.maxWeightKgLegacy = maxWeight;
        this.maxVolumeCbmLegacy = maxVolume;
        this.palletCount = palletCount != null ? palletCount : 0;
        this.palletStandardMm = palletStandardMm;
        this.palletStandard = palletStandardMm;
        this.doorPosition = doorPosition;
        this.sourceName = sourceName;
        // 레거시 unique key(uq_spec) 충돌을 피하기 위해 option_key에 차종 코드를 사용한다.
        this.optionKey = this.vehicleType;
    }

    @PrePersist
    protected void onCreate() {
        // 생성 시각은 최초 1회만 채우고, 수정 시각은 항상 갱신한다.
        if (createdAt == null) {
            createdAt = LocalDateTime.now();
        }
        updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }

    public Long getSpecId() {
        return specId;
    }

    public String getVehicleType() {
        return vehicleType;
    }

    public String getVehicleTypeKr() {
        return vehicleTypeKr;
    }

    public String getVehicleBodyType() {
        return vehicleBodyType;
    }

    public String getCategoryKr() {
        return categoryKr;
    }

    public String getVehicleModel() {
        return vehicleModel;
    }

    public BigDecimal getTonnage() {
        return tonnage;
    }

    public BigDecimal getMaxWeight() {
        return maxWeight;
    }

    public String getMaxWeightDisplay() {
        return maxWeightDisplay;
    }

    public BigDecimal getMaxVolume() {
        return maxVolume;
    }

    public Integer getCargoLengthCm() {
        return cargoLength != null ? cargoLength.intValue() : null;
    }

    public Integer getCargoWidthCm() {
        return cargoWidth != null ? cargoWidth.intValue() : null;
    }

    public Integer getCargoHeightCm() {
        return cargoHeight != null ? cargoHeight.intValue() : null;
    }

    public Integer getPalletCount() {
        return palletCount;
    }

    public String getPalletStandardMm() {
        return palletStandardMm;
    }

    public String getDoorPosition() {
        return doorPosition;
    }

    public String getSourceName() {
        return sourceName;
    }
}
