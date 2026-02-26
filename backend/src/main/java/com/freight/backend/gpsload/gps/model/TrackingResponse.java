package com.freight.backend.gpsload.gps.model;

import java.time.LocalDateTime;
import java.util.List;

/**
 * 화주용 트래킹 응답 DTO
 * 기사 현재 위치 + 계획 노선 + 이탈 이벤트
 */
public record TrackingResponse(
        // 기사 현재 위치
        DriverLocation currentLocation,
        // 계획 노선 (quote_stops 기반)
        List<RoutePoint> plannedRoute,
        // 이탈 이벤트 목록
        List<DeviationEventDto> deviationEvents,
        // 매칭 상태
        String matchStatus
) {
    /**
     * 기사 현재 위치
     */
    public record DriverLocation(
            Double lat,
            Double lng,
            Double speedKmh,
            Double bearing,
            Boolean isDeviation,
            Double deviationDistanceM,
            LocalDateTime loggedAt
    ) {}

    /**
     * 계획 노선 포인트
     */
    public record RoutePoint(
            int seq,
            String address,
            Double lat,
            Double lng
    ) {}

    /**
     * 이탈 이벤트 요약
     */
    public record DeviationEventDto(
            Long eventId,
            String severity,
            Double deviationKm,
            Double deviationPercent,
            LocalDateTime startedAt,
            LocalDateTime endedAt,
            String driverReason,
            Boolean shipperAck
    ) {}
}
