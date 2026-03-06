package com.freight.backend.dto.admin;

import lombok.Builder;
import lombok.Getter;

/**
 * 배차 관리 목록 응답 DTO
 * AdminIntegrationService.toDispatchRow()의 타입 안전 버전
 */
@Getter
@Builder
public class DispatchRowResponse {
    private final String matchId;
    private final String quoteId;
    private final String shipperName;
    private final String cargoType;
    private final String originAddress;
    private final String destinationAddress;
    private final String requestedAt;
    private final String departAt;
    private final String arriveAt;
    private final String driverName;
    private final String truckName;
    private final String matchStatus;
    private final boolean accepted;
    private final double currentVolumeCbm;
    private final double remainingVolumeCbm;
    private final int routeDistanceKm;
    private final int totalFare;
    private final int driverPayout;
    private final int platformFee;
    private final String paymentStatus;
    private final String settlementStatus;
    private final int unreadNotificationCount;
    private final String deviationSeverity;
}
