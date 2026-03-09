package com.freight.backend.dto.admin;

import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
public class AdminQuoteUpdateRequest {
    private String quoteId;
    private String status;
    private String cargoType;
    private Integer desiredPrice;
    private Integer finalPrice;
    private Integer distanceKm;
    private Integer weightKg;
    private Integer volumeCbm;
    private String originAddress;
    private String destinationAddress;
    private Boolean allowCombine;
    private String loadMethod;
    private String unloadMethod;
    private String deadlineAt;
    private String checklistSummary;
}

