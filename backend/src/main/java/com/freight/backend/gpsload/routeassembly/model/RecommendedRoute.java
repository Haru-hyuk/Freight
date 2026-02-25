package com.freight.backend.gpsmiss.routeassembly.model;

import java.util.List;

/**
 * Recommended route payload returned by route assembly engine.
 */
public record RecommendedRoute(
        int rank,
        List<Long> quoteIds,
        List<CargoVisit> visitOrder,
        RouteType routeType,

        int estimatedTotalDistanceM,
        int estimatedTotalTimeS,
        int emptyRunDistanceM,
        int routeDeviationM,

        double totalRevenue,
        double estimatedCost,
        double estimatedProfit,
        double profitPerKm,

        double totalCbm,
        double totalWeight,
        double cbmUtilization,
        double weightUtilization,

        double finalScore,
        ScoreBreakdown scoreBreakdown,

        int scheduleViolations,
        String calibrationId
) {

    public String efficiencyRating() {
        if (estimatedTotalDistanceM <= 0) return "GRAY";
        double emptyRatio = emptyRunDistanceM > 0
                ? (double) emptyRunDistanceM / estimatedTotalDistanceM : 0;
        if (emptyRatio < 0.15) return "GREEN";
        if (emptyRatio < 0.30) return "YELLOW";
        return "GRAY";
    }

    public enum RouteType {
        SINGLE,
        BUNDLED,
        HOME_ROUTE
    }

    public int cargoCount() {
        return quoteIds != null ? quoteIds.size() : 0;
    }

    public boolean isSingle() {
        return routeType == RouteType.SINGLE || cargoCount() == 1;
    }

    public boolean isBundled() {
        return cargoCount() > 1;
    }

    public int estimatedTotalTimeMinutes() {
        return estimatedTotalTimeS / 60;
    }

    public double estimatedTotalDistanceKm() {
        return estimatedTotalDistanceM / 1000.0;
    }

    public RecommendedRoute withCalibrationId(String calibrationId) {
        return new RecommendedRoute(
                rank,
                quoteIds,
                visitOrder,
                routeType,
                estimatedTotalDistanceM,
                estimatedTotalTimeS,
                emptyRunDistanceM,
                routeDeviationM,
                totalRevenue,
                estimatedCost,
                estimatedProfit,
                profitPerKm,
                totalCbm,
                totalWeight,
                cbmUtilization,
                weightUtilization,
                finalScore,
                scoreBreakdown,
                scheduleViolations,
                calibrationId
        );
    }
}
