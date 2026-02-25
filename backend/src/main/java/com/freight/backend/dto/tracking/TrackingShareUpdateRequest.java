package com.freight.backend.dto.tracking;

import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class TrackingShareUpdateRequest {
    @NotNull
    private Boolean enabled;
}
