package com.freight.backend.dto.admin;

import lombok.Builder;
import lombok.Getter;

/**
 * 실시간 배송 모니터링 응답 DTO
 * AdminIntegrationService.toLiveDeliveryRow()의 타입 안전 버전
 */
@Getter
@Builder
public class LiveDeliveryRowResponse {
    private final String matchId;
    private final String quoteId;
    private final String driverId;
    private final String driverName;
    private final String shipperName;
    private final String originAddress;
    private final String destinationAddress;
    private final double currentLat;
    private final double currentLng;
    private final double speedKmh;
    private final int progressPercent;
    private final double deviationDistanceKm;
    private final String routeUpdatedAt;
    private final String liveStatus;
}
