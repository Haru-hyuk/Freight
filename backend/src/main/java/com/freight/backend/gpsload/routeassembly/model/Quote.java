package com.freight.backend.gpsload.routeassembly.model;

import com.freight.backend.gpsload.loadplan.model.CargoHandling;
import com.freight.backend.gpsload.route.model.Place;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.List;

/**
 * Waiting quote payload used by route assembly.
 */
public record Quote(
        Long quoteId,
        Place origin,
        Place destination,
        Double volumeCbm,
        Double weightKg,
        Boolean allowCombine,
        Double finalPrice,
        LocalDateTime scheduledDate,
        Integer lengthCm,
        Integer widthCm,
        Integer heightCm,
        Boolean rotatable,
        Boolean stackable,
        Boolean fragile,
        Boolean noStack,
        Boolean bottomOnly,
        Double maxStackWeight,
        String status,
        List<CargoHandling> handling
) {
    public boolean isCombineAllowed() {
        return allowCombine != null && allowCombine;
    }

    public boolean hasValidCoordinates() {
        return origin != null
                && origin.latitude() != null && origin.longitude() != null
                && destination != null
                && destination.latitude() != null && destination.longitude() != null;
    }

    public boolean hasDimensions() {
        return lengthCm != null && widthCm != null && heightCm != null;
    }

    public long volumeCm3() {
        if (!hasDimensions()) return 0;
        return (long) lengthCm * widthCm * heightCm;
    }

    public boolean hasScheduledDate() {
        return scheduledDate != null;
    }

    public long minutesUntilScheduled(LocalDateTime now) {
        if (scheduledDate == null) return Long.MAX_VALUE;
        return Duration.between(now, scheduledDate).toMinutes();
    }
}
