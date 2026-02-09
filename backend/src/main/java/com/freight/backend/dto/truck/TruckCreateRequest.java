package com.freight.backend.dto.truck;

import java.math.BigDecimal;
import java.time.LocalDate;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class TruckCreateRequest {
    private String vehicleType;
    private BigDecimal tonnage;
    private BigDecimal maxWeight;
    private BigDecimal maxVolume;
    private String name;
    private String imageUrl;
    private Boolean approved;
    private String insurance;
    private BigDecimal odometerKm;
    private LocalDate lastInspectionDate;
}
