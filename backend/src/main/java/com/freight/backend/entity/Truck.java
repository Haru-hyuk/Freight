package com.freight.backend.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Table(
        name = "trucks",
        indexes = {
                @Index(name = "idx_trucks_driver_id", columnList = "driver_id"),
                @Index(name = "idx_trucks_approved_created_at", columnList = "approved, created_at")
        }
)
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Builder
public class Truck {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "truck_id")
    private Long truckId;

    @Column(name = "driver_id", nullable = false)
    private Long driverId;

    @Column(name = "vehicle_type")
    private String vehicleType;

    @Column(name = "vehicle_body_type")
    private String vehicleBodyType;

    @Column(name = "tonnage")
    private BigDecimal tonnage;

    @Column(name = "max_weight")
    private BigDecimal maxWeight;

    @Column(name = "max_volume")
    private BigDecimal maxVolume;

    @Column(name = "cargo_length")
    private BigDecimal cargoLength;

    @Column(name = "cargo_width")
    private BigDecimal cargoWidth;

    @Column(name = "cargo_height")
    private BigDecimal cargoHeight;

    @Column(name = "name")
    private String name;

    @Column(name = "image_url")
    private String imageUrl;

    @Column(name = "approved", nullable = false)
    private Boolean approved;

    @Column(name = "approval_status")
    private String approvalStatus;

    @Column(name = "review_memo", length = 1000)
    private String reviewMemo;

    @Column(name = "insurance")
    private String insurance;

    @Column(name = "odometer_km")
    private BigDecimal odometerKm;

    @Column(name = "last_inspection_date")
    private LocalDate lastInspectionDate;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
        if (approved == null) {
            approved = Boolean.FALSE;
        }
        if (approvalStatus == null || approvalStatus.isBlank()) {
            approvalStatus = Boolean.TRUE.equals(approved) ? "APPROVED" : "PENDING";
        }
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }

    public void updateFrom(
            String vehicleType,
            String vehicleBodyType,
            BigDecimal tonnage,
            BigDecimal maxWeight,
            BigDecimal maxVolume,
            BigDecimal cargoLength,
            BigDecimal cargoWidth,
            BigDecimal cargoHeight,
            String name,
            String imageUrl,
            String insurance,
            BigDecimal odometerKm,
            LocalDate lastInspectionDate
    ) {
        this.vehicleType = vehicleType;
        this.vehicleBodyType = vehicleBodyType;
        this.tonnage = tonnage;
        this.maxWeight = maxWeight;
        this.maxVolume = maxVolume;
        this.cargoLength = cargoLength;
        this.cargoWidth = cargoWidth;
        this.cargoHeight = cargoHeight;
        this.name = name;
        this.imageUrl = imageUrl;
        // 기사 정보 수정 후에는 관리자 재심사를 거치도록 강제한다.
        this.approved = Boolean.FALSE;
        this.approvalStatus = "PENDING";
        this.reviewMemo = null;
        this.insurance = insurance;
        this.odometerKm = odometerKm;
        this.lastInspectionDate = lastInspectionDate;
    }

    public void setApprovedStatus(Boolean approved) {
        this.approved = approved;
        this.approvalStatus = Boolean.TRUE.equals(approved) ? "APPROVED" : "PENDING";
        this.reviewMemo = null;
        this.updatedAt = LocalDateTime.now();
    }

    public void reviewForAdmin(boolean approved, String reviewMemo) {
        this.approved = approved;
        this.approvalStatus = approved ? "APPROVED" : "REJECTED";
        this.reviewMemo = reviewMemo;
        this.updatedAt = LocalDateTime.now();
    }
}

