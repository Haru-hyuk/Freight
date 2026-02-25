package com.freight.backend.gpsload.route.model;

import java.util.List;

public record RouteRequest(
        Place origin,
        Place destination,
        List<Place> waypoints
) {
}
