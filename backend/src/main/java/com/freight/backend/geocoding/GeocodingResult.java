package com.freight.backend.geocoding;

public record GeocodingResult(
        double lat,
        double lng,
        String normalizedAddress
) {
}
