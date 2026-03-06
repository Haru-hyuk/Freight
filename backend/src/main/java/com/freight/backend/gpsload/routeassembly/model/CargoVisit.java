package com.freight.backend.gpsload.routeassembly.model;

import com.freight.backend.gpsload.route.model.Place;

/**
 * 방문 순서 정보
 * 각 경유지(픽업/배송)의 순서와 예상 시간
 */
public record CargoVisit(
        int sequence,              // 방문 순서 (1부터 시작)
        Long quoteId,              // 관련 견적 ID
        VisitType type,            // 방문 유형 (PICKUP/WAYPOINT/DELIVERY)
        Place location,            // 방문 위치
        String address,            // 주소
        Long estimatedArrivalTime, // 예상 도착 시간 (밀리초, 출발 기준)
        Integer distanceFromPrev,  // 이전 지점으로부터 거리 (m)
        Integer durationFromPrev   // 이전 지점으로부터 소요 시간 (초)
) {
    /**
     * 방문 유형 열거형
     */
    public enum VisitType {
        PICKUP,   // 픽업 (상차)
        WAYPOINT, // 경유
        DELIVERY  // 배송 (하차)
    }

    /**
     * LIFO 하차 순서를 위한 stopOrder 계산
     * 배송 순서가 높을수록 먼저 적재해야 함 (나중에 하차)
     */
    public int getStopOrder(int totalDeliveries) {
        if (type == VisitType.DELIVERY) {
            // 배송 순서의 역순 (마지막 배송 = stopOrder 1)
            return totalDeliveries - sequence + 1;
        }
        return 0; // 픽업은 적재 순서 계산에 사용되지 않음
    }
}
