package com.freight.backend.gpsmiss.route.model;

public record Place(
        String name,
        String address,
        Double latitude,
        Double longitude
) {
}
