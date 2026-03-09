package com.freight.backend.dto.admin;

import java.util.List;
import lombok.Builder;
import lombok.Getter;

/**
 * 기사 승인 목록 응답 DTO
 * AdminIntegrationService.listDriverApprovals()의 타입 안전 버전
 */
@Getter
@Builder
public class DriverApprovalRowResponse {
    private final String driverId;
    private final String requestedAt;
    private final String name;
    private final String phone;
    private final String vehicleSummary;
    private final String licenseStatus;
    private final String approvalStatus;
    private final List<String> documents;
    private final String reviewMemo;
}
