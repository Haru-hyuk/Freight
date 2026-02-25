package com.freight.backend.gpsload.route.model;

public record Place(
        String name,
        String address,
        Double latitude,
        Double longitude
) {
}
