package com.freight.backend.gpsload.loadplan.model;

public record Placement(
        String id,
        int x,
        int y,
        int z,
        int length,
        int width,
        int height,
        double weight,
        int stopOrder,
        boolean stackable,
        int[] orientation,
        boolean fragile,
        boolean noStack,
        boolean bottomOnly,
        Double maxStackWeight
) {
}
