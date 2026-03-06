package com.freight.backend.dto.admin;

import lombok.Builder;
import lombok.Getter;

/**
 * 배송 이력 목록 응답 DTO
 * AdminIntegrationService.toDeliveryHistoryRow()의 타입 안전 버전
 */
@Getter
@Builder
public class DeliveryHistoryRowResponse {
    private final String matchId;
    private final String quoteId;
    private final String shipperName;
    private final String driverName;
    private final String originAddress;
    private final String destinationAddress;
    private final String departAt;
    private final String arriveAt;
    private final String matchStatus;
    private final String settlementStatus;
    private final int totalFare;
    private final int driverPayout;
}
