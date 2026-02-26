package com.freight.backend.gpsload.loadplan.model;

import java.util.List;

public record LoadPlanRequest(
        Truck truck,
        List<CargoItem> items
) {
}
