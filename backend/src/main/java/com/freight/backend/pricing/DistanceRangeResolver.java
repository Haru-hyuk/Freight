package com.freight.backend.pricing;

public final class DistanceRangeResolver {
    private DistanceRangeResolver() {
    }

    public static String resolveKey(int distanceKm) {
        if (distanceKm <= 0) {
            return null;
        }
        // Supports keys like KM_1_2, KM_51_55, KM_101_110, KM_491_500
        int min = distanceKm;
        int max = distanceKm;
        if (distanceKm <= 50) {
            int start = ((distanceKm - 1) / 2) * 2 + 1;
            min = start;
            max = start + 1;
        } else if (distanceKm <= 100) {
            int start = ((distanceKm - 51) / 5) * 5 + 51;
            min = start;
            max = start + 4;
        } else if (distanceKm <= 500) {
            int start = ((distanceKm - 101) / 10) * 10 + 101;
            min = start;
            max = start + 9;
        } else {
            return null;
        }
        return "KM_" + min + "_" + max;
    }
}
