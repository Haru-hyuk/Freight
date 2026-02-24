package com.freight.backend.gpsmiss.route.model;

public record RouteResponse(
        int distanceMeters,
        int durationSeconds,
        int segmentCount
) {
}
