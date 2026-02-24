package com.freight.backend.gpsmiss.loadplan.model;

import java.util.List;

public record LoadPlanResponse(
        List<Placement> placements,
        List<CargoItem> unplaced,
        Stats stats
) {
}
