package com.freight.backend.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
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
 * 기사 운행/복귀 경로 계획 테이블 매핑.
 */
@Entity
@Table(name = "driver_routes")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Builder
public class DriverRoute {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "route_id")
    private Long routeId;

    @Column(name = "driver_id", nullable = false)
    private Long driverId;

    @Column(name = "origin")
    private String origin;

    @Column(name = "origin_lat")
    private Double originLat;

    @Column(name = "origin_lng")
    private Double originLng;

    @Column(name = "destination")
    private String destination;

    @Column(name = "destination_lat")
    private Double destinationLat;

    @Column(name = "destination_lng")
    private Double destinationLng;

    @Column(name = "depart_at")
    private LocalDateTime departAt;

    @Column(name = "arrive_at")
    private LocalDateTime arriveAt;

    @Column(name = "expected_profit", nullable = false)
    private BigDecimal expectedProfit;

    @Column(name = "remaining_volume_cbm", nullable = false)
    private BigDecimal remainingVolumeCbm;

    @Column(name = "is_return_route", nullable = false)
    private Boolean isReturnRoute;

    @Column(name = "stops_json", columnDefinition = "json")
    private String stopsJson;

    @Column(name = "max_weight_kg", nullable = false)
    private BigDecimal maxWeightKg;

    @Column(name = "current_weight_kg", nullable = false)
    private BigDecimal currentWeightKg;

    @Column(name = "max_volume_cbm", nullable = false)
    private BigDecimal maxVolumeCbm;

    @Column(name = "current_volume_cbm", nullable = false)
    private BigDecimal currentVolumeCbm;

    @Column(name = "status", nullable = false)
    private String status;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
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
