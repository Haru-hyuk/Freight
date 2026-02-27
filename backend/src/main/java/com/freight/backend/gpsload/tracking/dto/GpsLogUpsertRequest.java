package com.freight.backend.gpsload.tracking.dto;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class GpsLogUpsertRequest {

    @NotNull
    @DecimalMin(value = "-90.0")
    @DecimalMax(value = "90.0")
    private Double lat;

    @NotNull
    @DecimalMin(value = "-180.0")
    @DecimalMax(value = "180.0")
    private Double lng;

    @DecimalMin(value = "0.0")
    @DecimalMax(value = "250.0")
    private Double speedKmh;

    @DecimalMin(value = "0.0")
    @DecimalMax(value = "360.0")
    private Double bearing;
}
