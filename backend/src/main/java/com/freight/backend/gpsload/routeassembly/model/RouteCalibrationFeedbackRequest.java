package com.freight.backend.gpsload.routeassembly.model;

public record RouteCalibrationFeedbackRequest(
        String calibrationId,
        Boolean accepted,
        Boolean completedOnTime,
        Boolean cancelled,
        Double realizedProfit,
        String note
) {
    public boolean isValid() {
        if (calibrationId == null || calibrationId.isBlank()) {
            return false;
        }
        return accepted != null
                || completedOnTime != null
                || cancelled != null
                || realizedProfit != null
                || (note != null && !note.isBlank());
    }
}

