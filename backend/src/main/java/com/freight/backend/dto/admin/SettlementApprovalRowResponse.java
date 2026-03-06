package com.freight.backend.dto.admin;

import lombok.Builder;
import lombok.Getter;

/**
 * 정산 승인 목록 응답 DTO
 * AdminIntegrationService.toSettlementApprovalRow()의 타입 안전 버전
 */
@Getter
@Builder
public class SettlementApprovalRowResponse {
    private final String settlementId;
    private final String matchId;
    private final String driverId;
    private final String driverName;
    private final String shipperName;
    private final String dueDate;
    private final int totalFare;
    private final int driverPayout;
    private final String settlementStatus;
    private final String approvalStatus;
    private final String reviewMemo;
}
