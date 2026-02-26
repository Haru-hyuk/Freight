package com.freight.backend.gpsload.loadplan.model;

import java.util.List;

public record LoadPlanResponse(
        List<Placement> placements,
        List<CargoItem> unplaced,
        Stats stats
) {
}
