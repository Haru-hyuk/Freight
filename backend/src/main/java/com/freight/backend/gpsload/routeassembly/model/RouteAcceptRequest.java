package com.freight.backend.gpsload.routeassembly.model;

import java.util.List;

/**
 * 기사 추천 수락 요청
 */
public record RouteAcceptRequest(
        Long driverId,
        List<Long> quoteIds
) {
    public boolean isValid() {
        return driverId != null
                && quoteIds != null
                && !quoteIds.isEmpty()
                && quoteIds.stream().allMatch(id -> id != null && id > 0);
    }
}

