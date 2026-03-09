package com.freight.backend.dto.admin;

import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
public class AdminPricingAdditionalUpdateRequest {
    private String additionalPricingId;
    private Integer additionalFare;
    private Double rateDelta;
    private Boolean active;
}

