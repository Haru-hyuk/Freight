package com.freight.backend.gpsload.tracking.dto;

import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class TrackingShareUpdateRequest {
    @NotNull
    private Boolean enabled;
}
