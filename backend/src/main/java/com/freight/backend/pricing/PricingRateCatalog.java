package com.freight.backend.pricing;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import java.time.LocalDateTime;

/**
 * 거리 구간 + 차종별 기본 운임 기준 테이블(pricing_rate_catalog) 엔티티.
 */
@Entity
@Table(
        name = "pricing_rate_catalog",
        uniqueConstraints = {
                @UniqueConstraint(
                        name = "uk_pricing_rate_range_vehicle",
                        columnNames = {"range_key", "vehicle_type"}
                )
        }
)
public class PricingRateCatalog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "rate_id")
    private Long rateId;

    @Column(name = "range_key", nullable = false)
    private String rangeKey;

    @Column(name = "min_distance_km", nullable = false)
    private Integer minDistanceKm;

    @Column(name = "max_distance_km", nullable = false)
    private Integer maxDistanceKm;

    @Column(name = "vehicle_type", nullable = false)
    private String vehicleType;

    @Column(name = "base_rate_won", nullable = false)
    private Integer baseRateWon;

    @Column(name = "source_name")
    private String sourceName;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    protected PricingRateCatalog() {
    }

    /**
     * 업서트를 위한 최소 키(거리구간 + 차종) 생성.
     */
    public static PricingRateCatalog create(String rangeKey, String vehicleType) {
        PricingRateCatalog row = new PricingRateCatalog();
        row.rangeKey = rangeKey;
        row.vehicleType = vehicleType;
        return row;
    }

    /**
     * 기준 운임 데이터 갱신.
     */
    public void applyData(
            Integer minDistanceKm,
            Integer maxDistanceKm,
            Integer baseRateWon,
            String sourceName
    ) {
        this.minDistanceKm = minDistanceKm;
        this.maxDistanceKm = maxDistanceKm;
        this.baseRateWon = baseRateWon;
        this.sourceName = sourceName;
    }

    @PrePersist
    protected void onCreate() {
        if (createdAt == null) {
            createdAt = LocalDateTime.now();
        }
        updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }

    public Long getRateId() {
        return rateId;
    }

    public String getRangeKey() {
        return rangeKey;
    }

    public Integer getMinDistanceKm() {
        return minDistanceKm;
    }

    public Integer getMaxDistanceKm() {
        return maxDistanceKm;
    }

    public String getVehicleType() {
        return vehicleType;
    }

    public Integer getBaseRateWon() {
        return baseRateWon;
    }

    public String getSourceName() {
        return sourceName;
    }
}
