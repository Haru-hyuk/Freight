package com.freight.backend.gpsload.routeassembly.model;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;
import com.freight.backend.gpsload.route.model.Place;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Locale;

/**
 * 기사 상태 정보.
 */
public record DriverState(
        Long driverId,
        Place currentLocation,
        Place endLocation,
        Double remainingCbm,
        Double remainingWeight,
        CombinePreference combinePreference,
        Long truckId,
        List<InTransitCargo> inTransitCargos,
        List<Place> remainingDeliveries,
        LocalDateTime availableAt
) {
    public DriverState(
            Long driverId,
            Place currentLocation,
            Place endLocation,
            Double remainingCbm,
            Double remainingWeight,
            CombinePreference combinePreference,
            Long truckId
    ) {
        this(driverId, currentLocation, endLocation, remainingCbm, remainingWeight, combinePreference, truckId, List.of(), List.of(), null);
    }

    public enum CombinePreference {
        ALLOW,
        DISALLOW,
        HOME_ROUTE;

        @JsonCreator
        public static CombinePreference fromValue(String raw) {
            if (raw == null || raw.isBlank()) {
                return ALLOW;
            }
            String normalized = raw.trim().toUpperCase(Locale.ROOT);
            return switch (normalized) {
                case "ALLOW", "BUNDLED" -> ALLOW;
                case "DISALLOW", "SINGLE" -> DISALLOW;
                case "HOME_ROUTE" -> HOME_ROUTE;
                default -> ALLOW;
            };
        }

        @JsonValue
        public String toValue() {
            return name();
        }
    }

    public boolean canLoad(double cbm, double weight) {
        return (remainingCbm == null || cbm <= remainingCbm)
                && (remainingWeight == null || weight <= remainingWeight);
    }

    public DriverState afterLoading(double cbm, double weight) {
        return new DriverState(
                driverId,
                currentLocation,
                endLocation,
                remainingCbm != null ? remainingCbm - cbm : null,
                remainingWeight != null ? remainingWeight - weight : null,
                combinePreference,
                truckId,
                inTransitCargos,
                remainingDeliveries,
                availableAt
        );
    }

    public record InTransitCargo(
            String cargoId,
            Double volumeCbm,
            Double weightKg,
            Long quoteId,
            Place destination
    ) {
    }
}
