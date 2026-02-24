package com.freight.backend.gpsmiss.loadplan.model;

public record LoadPlanSavedResponse(
        Long planId,
        LoadPlanResponse result
) {
}
