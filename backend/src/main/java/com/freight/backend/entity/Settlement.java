package com.freight.backend.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
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
import lombok.Setter;

@Entity
@Table(name = "settlements")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Builder
public class Settlement {

    public enum ShipperPaymentStatus {
        PENDING, COMPLETED, FAILED, REFUNDED
    }

    public enum ShipperPaymentMethod {
        CARD, TRANSFER, PREPAID
    }

    public enum SettlementType {
        NORMAL, FAST, INSTANT
    }

    public enum SettlementStatus {
        PENDING, PROCESSING, COMPLETED, FAILED
    }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "settlement_id")
    private Long settlementId;

    @Column(name = "match_id", nullable = false)
    private Long matchId;

    @Column(name = "driver_id", nullable = false)
    private Long driverId;

    @Column(name = "shipper_id", nullable = false)
    private Long shipperId;

    @Column(name = "total_fare", nullable = false, precision = 10, scale = 2)
    private BigDecimal totalFare;

    @Column(name = "platform_fee_rate", nullable = false, precision = 4, scale = 2)
    private BigDecimal platformFeeRate;

    @Column(name = "platform_fee", nullable = false, precision = 10, scale = 2)
    private BigDecimal platformFee;

    @Column(name = "fast_fee_rate", nullable = false, precision = 4, scale = 2)
    private BigDecimal fastFeeRate;

    @Column(name = "fast_fee", nullable = false, precision = 10, scale = 2)
    private BigDecimal fastFee;

    @Column(name = "driver_payout", nullable = false, precision = 10, scale = 2)
    private BigDecimal driverPayout;

    @Setter
    @Enumerated(EnumType.STRING)
    @Column(name = "shipper_payment_status", nullable = false)
    private ShipperPaymentStatus shipperPaymentStatus;

    @Enumerated(EnumType.STRING)
    @Column(name = "shipper_payment_method")
    private ShipperPaymentMethod shipperPaymentMethod;

    @Setter
    @Column(name = "shipper_paid_at")
    private LocalDateTime shipperPaidAt;

    @Enumerated(EnumType.STRING)
    @Column(name = "settlement_type", nullable = false)
    private SettlementType settlementType;

    @Setter
    @Enumerated(EnumType.STRING)
    @Column(name = "settlement_status", nullable = false)
    private SettlementStatus settlementStatus;

    @Column(name = "due_date")
    private LocalDate dueDate;

    @Setter
    @Column(name = "completed_at")
    private LocalDateTime completedAt;

    @Column(name = "deposit_account")
    private String depositAccount;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
        if (shipperPaymentStatus == null) {
            shipperPaymentStatus = ShipperPaymentStatus.PENDING;
        }
        if (settlementStatus == null) {
            settlementStatus = SettlementStatus.PENDING;
        }
        if (settlementType == null) {
            settlementType = SettlementType.NORMAL;
        }
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
