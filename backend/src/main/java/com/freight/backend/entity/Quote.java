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
import java.time.LocalDateTime;
import java.util.UUID;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

/**
 * 견적 엔티티
 * - 화주가 등록하는 운송 요청 정보
 * - 출발지/도착지, 화물정보, 희망가격 포함
 * - 상태: OPEN → MATCHED → IN_TRANSIT → DELIVERED
 */
@Entity
@Table(
        name = "quotes",
        indexes = {
                @Index(name = "idx_quotes_shipper_id", columnList = "shipper_id"),
                @Index(name = "idx_quotes_status", columnList = "status"),
                @Index(name = "idx_quotes_delivery_schedule", columnList = "delivery_schedule")
        }
)
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Builder
public class Quote {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "quote_id")
    private Long quoteId;

    @JdbcTypeCode(SqlTypes.BINARY)
    @Column(name = "public_id", nullable = false, unique = true, columnDefinition = "BINARY(16)")
    private UUID publicId;

    @Column(name = "shipper_id", nullable = false)
    private Long shipperId;

    @Column(name = "truck_id")
    private Long truckId;

    @Column(name = "origin_address")
    private String originAddress;

    @Column(name = "origin_address_detail")
    private String originAddressDetail;

    @Column(name = "destination_address")
    private String destinationAddress;

    @Column(name = "destination_address_detail")
    private String destinationAddressDetail;

    @Column(name = "sender_name")
    private String senderName;

    @Column(name = "sender_phone")
    private String senderPhone;

    @Column(name = "receiver_name")
    private String receiverName;

    @Column(name = "receiver_phone")
    private String receiverPhone;

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

    @Column(name = "vehicle_body_type")
    private String vehicleBodyType;

    @Column(name = "cargo_name")
    private String cargoName;

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

    @Column(name = "pickup_schedule_start")
    private LocalDateTime pickupScheduleStart;

    @Column(name = "delivery_deadline")
    private LocalDateTime deliveryDeadline;

    @Column(name = "delivery_schedule")
    private LocalDateTime deliverySchedule;

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
        if (publicId == null) {
            publicId = UUID.randomUUID();
        }
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
            String originAddressDetail,
            String destinationAddress,
            String destinationAddressDetail,
            String senderName,
            String senderPhone,
            String receiverName,
            String receiverPhone,
            Double originLat,
            Double originLng,
            Double destinationLat,
            Double destinationLng,
            Integer distanceKm,
            Integer weightKg,
            Integer volumeCbm,
            String vehicleType,
            String vehicleBodyType,
            String cargoName,
            String cargoType,
            String cargoDesc,
            Integer basePrice,
            Integer distancePrice,
            Integer extraPrice,
            Integer desiredPrice,
            Integer finalPrice,
            Boolean allowCombine,
            String loadMethod,
            String unloadMethod,
            LocalDateTime pickupScheduleStart,
            LocalDateTime deliveryDeadline,
            LocalDateTime deliverySchedule
    ) {
        this.truckId = truckId;
        this.originAddress = originAddress;
        this.originAddressDetail = originAddressDetail;
        this.destinationAddress = destinationAddress;
        this.destinationAddressDetail = destinationAddressDetail;
        this.senderName = senderName;
        this.senderPhone = senderPhone;
        this.receiverName = receiverName;
        this.receiverPhone = receiverPhone;
        this.originLat = originLat;
        this.originLng = originLng;
        this.destinationLat = destinationLat;
        this.destinationLng = destinationLng;
        this.distanceKm = distanceKm;
        this.weightKg = weightKg;
        this.volumeCbm = volumeCbm;
        this.vehicleType = vehicleType;
        this.vehicleBodyType = vehicleBodyType;
        this.cargoName = cargoName;
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
        this.pickupScheduleStart = pickupScheduleStart;
        this.deliveryDeadline = deliveryDeadline;
        this.deliverySchedule = deliverySchedule;
    }

    public void updateByAdmin(
            String status,
            String cargoType,
            Integer desiredPrice,
            Integer finalPrice,
            Integer distanceKm,
            Integer weightKg,
            Integer volumeCbm,
            String originAddress,
            String destinationAddress,
            Boolean allowCombine,
            String loadMethod,
            String unloadMethod,
            LocalDateTime deliverySchedule,
            String checklistSummary
    ) {
        if (status != null && !status.isBlank()) {
            this.status = status;
        }
        if (cargoType != null) {
            this.cargoType = cargoType;
        }
        if (desiredPrice != null) {
            this.desiredPrice = desiredPrice;
        }
        if (finalPrice != null) {
            this.finalPrice = finalPrice;
        }
        if (distanceKm != null) {
            this.distanceKm = distanceKm;
        }
        if (weightKg != null) {
            this.weightKg = weightKg;
        }
        if (volumeCbm != null) {
            this.volumeCbm = volumeCbm;
        }
        if (originAddress != null) {
            this.originAddress = originAddress;
        }
        if (destinationAddress != null) {
            this.destinationAddress = destinationAddress;
        }
        if (allowCombine != null) {
            this.allowCombine = allowCombine;
        }
        if (loadMethod != null && !loadMethod.isBlank()) {
            this.loadMethod = loadMethod;
        }
        if (unloadMethod != null && !unloadMethod.isBlank()) {
            this.unloadMethod = unloadMethod;
        }
        this.deliveryDeadline = deliverySchedule;
        this.deliverySchedule = deliverySchedule;
        if (this.pickupScheduleStart == null && deliverySchedule != null) {
            this.pickupScheduleStart = deliverySchedule;
        }
        if (checklistSummary != null) {
            this.cargoDesc = checklistSummary;
        }
        this.updatedAt = LocalDateTime.now();
    }

    public void updateResolvedCoordinates(
            Double originLat,
            Double originLng,
            Double destinationLat,
            Double destinationLng
    ) {
        this.originLat = originLat;
        this.originLng = originLng;
        this.destinationLat = destinationLat;
        this.destinationLng = destinationLng;
        this.updatedAt = LocalDateTime.now();
    }

    /** 견적 상태를 IN_TRANSIT로 변경 (운송 시작 시) */
    public void markInTransit() {
        this.status = "IN_TRANSIT";
    }

    /** 견적 상태를 DELIVERED로 변경 (운송 완료 시) */
    public void markDelivered() {
        this.status = "DELIVERED";
    }

    /** 견적 상태를 MATCHED로 변경 (기사가 수락 시) */
    public void markMatched() {
        this.status = "MATCHED";
    }

    /**
     * 견적 상태를 OPEN으로 되돌림 (매칭 취소 시)
     */
    public void reopen() {
        this.status = "OPEN";
    }

    /**
     * 견적 상태를 CANCELLED로 변경
     */
    public void cancel() {
        this.status = "CANCELLED";
    }

    /**
     * 견적이 공개(OPEN) 상태인지 확인
     */
    public boolean isOpen() {
        return "OPEN".equals(this.status);
    }
}
