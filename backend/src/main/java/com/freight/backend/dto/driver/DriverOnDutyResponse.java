package com.freight.backend.dto.driver;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
@AllArgsConstructor
public class DriverOnDutyResponse {

    private Long driverId;
    private Boolean onDuty;
}
