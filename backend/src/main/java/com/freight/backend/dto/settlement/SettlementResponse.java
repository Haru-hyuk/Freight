package com.freight.backend.dto.settlement;

import com.freight.backend.entity.Settlement;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class SettlementResponse {

    private Long settlementId;
    private Long matchId;
    private Long driverId;
    private Long shipperId;

    private BigDecimal totalFare;
    private BigDecimal platformFee;
    private BigDecimal fastFee;
    private BigDecimal routeDistanceKm;
    private BigDecimal fuelCost;
    private BigDecimal tollFee;
    private BigDecimal driverPayout;

    private String shipperPaymentStatus;
    private String shipperPaymentMethod;
    private LocalDateTime shipperPaidAt;

    private String settlementType;
    private String settlementStatus;
    private LocalDate dueDate;
    private LocalDateTime completedAt;

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public static SettlementResponse from(Settlement settlement) {
        return SettlementResponse.builder()
                .settlementId(settlement.getSettlementId())
                .matchId(settlement.getMatchId())
                .driverId(settlement.getDriverId())
                .shipperId(settlement.getShipperId())
                .totalFare(settlement.getTotalFare())
                .platformFee(settlement.getPlatformFee())
                .fastFee(settlement.getFastFee())
                .routeDistanceKm(settlement.getRouteDistanceKm())
                .fuelCost(settlement.getFuelCost())
                .tollFee(settlement.getTollFee())
                .driverPayout(settlement.getDriverPayout())
                .shipperPaymentStatus(settlement.getShipperPaymentStatus() == null ? null : settlement.getShipperPaymentStatus().name())
                .shipperPaymentMethod(settlement.getShipperPaymentMethod() == null ? null : settlement.getShipperPaymentMethod().name())
                .shipperPaidAt(settlement.getShipperPaidAt())
                .settlementType(settlement.getSettlementType() == null ? null : settlement.getSettlementType().name())
                .settlementStatus(settlement.getSettlementStatus() == null ? null : settlement.getSettlementStatus().name())
                .dueDate(settlement.getDueDate())
                .completedAt(settlement.getCompletedAt())
                .createdAt(settlement.getCreatedAt())
                .updatedAt(settlement.getUpdatedAt())
                .build();
    }
}
