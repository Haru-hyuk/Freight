package com.freight.backend.dto.driver;

import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
public class DriverOnDutyRequest {

    @NotNull(message = "enabled is required")
    private Boolean enabled;
}
