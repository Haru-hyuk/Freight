package com.freight.backend.dto.admin;

import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
public class AdminPricingVehicleUpdateRequest {
    private String vehiclePricingId;
    private Integer baseFare;
    private Integer additionalFare;
    private Double surchargeRate;
    private Boolean active;
}

