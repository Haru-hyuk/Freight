package com.freight.backend.gpsload.loadplan.model;

public record LoadPlanSavedResponse(
        Long planId,
        LoadPlanResponse result
) {
}
