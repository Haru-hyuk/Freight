package com.freight.backend.gpsload.loadplan.model;

import com.fasterxml.jackson.annotation.JsonAlias;

public record Truck(
        @JsonAlias({"truck_id", "truckId"})
        Long truckId,
        int length,
        int width,
        int height,
        double maxWeight,
        @JsonAlias({"door_position", "doorPosition"})
        String doorPosition
) {
}
