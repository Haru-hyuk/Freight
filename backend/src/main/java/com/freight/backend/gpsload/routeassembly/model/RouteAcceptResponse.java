package com.freight.backend.gpsload.routeassembly.model;

import java.util.List;

/**
 * 기사 추천 수락 응답
 */
public record RouteAcceptResponse(
        boolean success,
        String message,
        int requestedCount,
        int acceptedCount,
        List<Long> acceptedQuoteIds
) {
    public static RouteAcceptResponse success(String message, int requestedCount, int acceptedCount, List<Long> acceptedQuoteIds) {
        return new RouteAcceptResponse(true, message, requestedCount, acceptedCount, acceptedQuoteIds);
    }

    public static RouteAcceptResponse failure(String message, int requestedCount, int acceptedCount, List<Long> acceptedQuoteIds) {
        return new RouteAcceptResponse(false, message, requestedCount, acceptedCount, acceptedQuoteIds);
    }
}

