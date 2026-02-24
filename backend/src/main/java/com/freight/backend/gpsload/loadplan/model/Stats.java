package com.freight.backend.gpsmiss.loadplan.model;

public record Stats(
        double utilization,
        double totalWeight,
        int placedCount,
        int unplacedCount,
        int violations
) {
}
