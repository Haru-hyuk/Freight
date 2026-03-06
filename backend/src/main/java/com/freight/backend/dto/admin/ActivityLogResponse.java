package com.freight.backend.dto.admin;

import lombok.Builder;
import lombok.Getter;

/**
 * 활동 로그 응답 DTO
 * AdminIntegrationService.listActivityLogs()의 타입 안전 버전
 */
@Getter
@Builder
public class ActivityLogResponse {
    private final String id;
    private final String timestamp;
    private final String action;
    private final String targetId;
    private final String mode;
    private final String message;
}
