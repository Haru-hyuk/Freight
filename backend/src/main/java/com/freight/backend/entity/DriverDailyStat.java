package com.freight.backend.entity;

import jakarta.persistence.Column;
import jakarta.persistence.EmbeddedId;
import jakarta.persistence.Entity;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * 기사 일별 운영 통계 테이블 매핑.
 * (route/planner 확장 기능에서 일별 집계를 DB에서 바로 조회할 수 있도록 유지)
 */
@Entity
@Table(name = "driver_daily_stats")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Builder
public class DriverDailyStat {

    @EmbeddedId
    private DriverDailyStatId id;

    @Column(name = "total_trips", nullable = false)
    private Integer totalTrips;

    @Column(name = "total_distance_km", nullable = false)
    private BigDecimal totalDistanceKm;

    @Column(name = "total_revenue", nullable = false)
    private BigDecimal totalRevenue;

    @Column(name = "net_income", nullable = false)
    private BigDecimal netIncome;

    @Column(name = "platform_fee")
    private BigDecimal platformFee;

    @Column(name = "fuel_cost")
    private BigDecimal fuelCost;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        LocalDateTime now = LocalDateTime.now();
        if (createdAt == null) {
            createdAt = now;
        }
        updatedAt = now;
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
