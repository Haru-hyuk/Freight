package com.freight.backend.dto.algorithm;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import java.util.List;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class RouteRecommendRequest {

    @NotNull
    @DecimalMin(value = "-90.0")
    @DecimalMax(value = "90.0")
    private Double currentLat;

    @NotNull
    @DecimalMin(value = "-180.0")
    @DecimalMax(value = "180.0")
    private Double currentLng;

    @DecimalMin(value = "-90.0")
    @DecimalMax(value = "90.0")
    private Double endLat;

    @DecimalMin(value = "-180.0")
    @DecimalMax(value = "180.0")
    private Double endLng;

    // ALLOW, DISALLOW, HOME_ROUTE
    private String combinePreference;

    // SIMPLE, SMART
    private String mode;

    // Optional: current cargo already loaded on truck
    @DecimalMin(value = "0.0")
    private Double loadedWeightKg;

    @DecimalMin(value = "0.0")
    private Double loadedVolumeCbm;

    // Optional: max pickup distance from current location
    @DecimalMin(value = "0.0")
    private Double maxPickupDistanceKm;

    // Optional: evaluate/recommend only these quote IDs when provided.
    private List<Long> selectedQuoteIds;
}

