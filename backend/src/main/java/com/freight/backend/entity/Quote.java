package com.freight.backend.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import java.time.LocalDateTime;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "quotes")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Builder
public class Quote {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "quote_id")
    private Long quoteId;

    @Column(name = "shipper_id", nullable = false)
    private Long shipperId;

    @Column(name = "truck_id")
    private Long truckId;

    @Column(name = "origin_address")
    private String originAddress;

    @Column(name = "destination_address")
    private String destinationAddress;

    @Column(name = "origin_lat")
    private Double originLat;

    @Column(name = "origin_lng")
    private Double originLng;

    @Column(name = "destination_lat")
    private Double destinationLat;

    @Column(name = "destination_lng")
    private Double destinationLng;

    @Column(name = "distance_km")
    private Integer distanceKm;

    @Column(name = "weight_kg")
    private Integer weightKg;

    @Column(name = "volume_cbm")
    private Integer volumeCbm;

    @Column(name = "vehicle_type")
    private String vehicleType;

    @Column(name = "cargo_type")
    private String cargoType;

    @Column(name = "cargo_desc")
    private String cargoDesc;

    @Column(name = "base_price", nullable = false)
    private Integer basePrice;

    @Column(name = "distance_price", nullable = false)
    private Integer distancePrice;

    @Column(name = "extra_price", nullable = false)
    private Integer extraPrice;

    @Column(name = "desired_price", nullable = false)
    private Integer desiredPrice;

    @Column(name = "final_price", nullable = false)
    private Integer finalPrice;

    @Column(name = "allow_combine", nullable = false)
    private Boolean allowCombine;

    @Column(name = "load_method", nullable = false)
    private String loadMethod;

    @Column(name = "unload_method", nullable = false)
    private String unloadMethod;

    @Column(name = "status", nullable = false)
    private String status;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
        if (status == null || status.isBlank()) {
            status = "OPEN";
        }
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }

    public void updateFrom(
            Long truckId,
            String originAddress,
            String destinationAddress,
            Double originLat,
            Double originLng,
            Double destinationLat,
            Double destinationLng,
            Integer distanceKm,
            Integer weightKg,
            Integer volumeCbm,
            String vehicleType,
            String cargoType,
            String cargoDesc,
            Integer basePrice,
            Integer distancePrice,
            Integer extraPrice,
            Integer desiredPrice,
            Integer finalPrice,
            Boolean allowCombine,
            String loadMethod,
            String unloadMethod
    ) {
        this.truckId = truckId;
        this.originAddress = originAddress;
        this.destinationAddress = destinationAddress;
        this.originLat = originLat;
        this.originLng = originLng;
        this.destinationLat = destinationLat;
        this.destinationLng = destinationLng;
        this.distanceKm = distanceKm;
        this.weightKg = weightKg;
        this.volumeCbm = volumeCbm;
        this.vehicleType = vehicleType;
        this.cargoType = cargoType;
        this.cargoDesc = cargoDesc;
        this.basePrice = basePrice;
        this.distancePrice = distancePrice;
        this.extraPrice = extraPrice;
        this.desiredPrice = desiredPrice;
        this.finalPrice = finalPrice;
        this.allowCombine = allowCombine;
        this.loadMethod = loadMethod;
        this.unloadMethod = unloadMethod;
    }
}
