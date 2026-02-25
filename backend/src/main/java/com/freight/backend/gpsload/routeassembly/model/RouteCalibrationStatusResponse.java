package com.freight.backend.gpsmiss.routeassembly.model;

import java.time.LocalDateTime;

public record RouteCalibrationStatusResponse(
        boolean enabled,
        boolean calibrated,
        int sampleCount,
        int minSamples,
        int lookbackSamples,
        double consolidationWeight,
        double profitWeight,
        double routeWeight,
        String message,
        LocalDateTime updatedAt
) {
}

