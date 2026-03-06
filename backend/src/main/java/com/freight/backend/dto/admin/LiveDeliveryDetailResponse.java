package com.freight.backend.dto.admin;

import java.util.List;
import lombok.Builder;
import lombok.Getter;

/**
 * 실시간 배송 상세 응답 DTO
 * AdminIntegrationService.getLiveDeliveryDetail()의 타입 안전 버전
 */
@Getter
@Builder
public class LiveDeliveryDetailResponse {
    private final String matchId;
    private final String cargoType;
    private final int cargoWeightKg;
    private final String truckType;
    private final double truckWeightTon;
    private final double truckVolumeCbm;
    private final int totalRouteKm;
    private final int routeProgressPercent;
    private final String deviationReason;
    private final List<RoutePoint> plannedRoute;
    private final List<RoutePoint> currentRoute;
    private final List<TimelineEvent> timeline;

    @Getter
    @Builder
    public static class RoutePoint {
        private final double lat;
        private final double lng;
        private final String recordedAt;
    }

    @Getter
    @Builder
    public static class TimelineEvent {
        private final String id;
        private final String label;
        private final String occurredAt;
        private final String note;
    }
}
