package com.freight.backend.dto.admin;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class AdminTruckSpecUpdateRequest {
    private String vehicleTypeKr;
    private String categoryKr;
    private String vehicleModel;
    private Double tonnage;
    private Integer maxWeight;
    private String maxWeightDisplay;
    private Integer maxVolume;
    private Integer cargoLengthCm;
    private Integer cargoWidthCm;
    private Integer cargoHeightCm;
    private Integer palletCount;
    private String palletStandardMm;
    private String doorPosition;
    private String sourceName;
}
