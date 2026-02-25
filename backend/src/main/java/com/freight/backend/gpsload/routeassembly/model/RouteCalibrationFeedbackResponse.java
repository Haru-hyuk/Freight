package com.freight.backend.gpsmiss.routeassembly.model;

public record RouteCalibrationFeedbackResponse(
        boolean success,
        String calibrationId,
        String message
) {
    public static RouteCalibrationFeedbackResponse ok(String calibrationId, String message) {
        return new RouteCalibrationFeedbackResponse(true, calibrationId, message);
    }

    public static RouteCalibrationFeedbackResponse fail(String calibrationId, String message) {
        return new RouteCalibrationFeedbackResponse(false, calibrationId, message);
    }
}

