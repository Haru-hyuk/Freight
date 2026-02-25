package com.freight.backend.gpsload.routeassembly.model;

import com.freight.backend.gpsload.route.model.Place;

import java.time.LocalDateTime;
import java.util.List;

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
        HOME_ROUTE
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
