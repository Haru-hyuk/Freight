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
import java.time.LocalDate;
import java.time.LocalDateTime;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "trucks")
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
            String name,
            String imageUrl,
            Boolean approved,
            String insurance,
            BigDecimal odometerKm,
            LocalDate lastInspectionDate
    ) {
        this.vehicleType = vehicleType;
        this.vehicleBodyType = vehicleBodyType;
        this.tonnage = tonnage;
        this.maxWeight = maxWeight;
        this.maxVolume = maxVolume;
        this.name = name;
        this.imageUrl = imageUrl;
        this.approved = approved;
        this.insurance = insurance;
        this.odometerKm = odometerKm;
        this.lastInspectionDate = lastInspectionDate;
    }
}
