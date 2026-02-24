package com.freight.backend.gpsmiss.loadplan.model;

import java.util.List;

public record LoadPlanRequest(
        Truck truck,
        List<CargoItem> items
) {
}
