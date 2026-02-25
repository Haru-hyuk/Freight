package com.freight.backend.gpsload.loadplan.model;

public record Stats(
        double utilization,
        double totalWeight,
        int placedCount,
        int unplacedCount,
        int violations
) {
}
