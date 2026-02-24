package com.freight.backend.gpsmiss.route.model;

import java.util.List;

public record RouteRequest(
        Place origin,
        Place destination,
        List<Place> waypoints
) {
}
