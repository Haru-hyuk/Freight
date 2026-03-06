package com.freight.backend.dto.admin;

import java.util.List;
import lombok.Builder;
import lombok.Getter;

/**
 * 차량 승인 목록 응답 DTO
 * AdminIntegrationService.listTruckApprovals()의 타입 안전 버전
 */
@Getter
@Builder
public class TruckApprovalRowResponse {
    private final String truckId;
    private final String driverId;
    private final String driverName;
    private final String requestedAt;
    private final String plateNumber;
    private final String vehicleType;
    private final int capacity;
    private final int manufacturingYear;
    private final String insuranceStatus;
    private final String approvalStatus;
    private final List<String> documents;
    private final String reviewMemo;
}
