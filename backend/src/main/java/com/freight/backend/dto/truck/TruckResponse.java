package com.freight.backend.dto.truck;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import lombok.AllArgsConstructor;
import lombok.Getter;

@Getter
@AllArgsConstructor
public class TruckResponse {
    private Long truckId;
    private Long driverId;
    private String vehicleType;
    private String vehicleBodyType;
    private BigDecimal tonnage;
    private BigDecimal maxWeight;
    private BigDecimal maxVolume;
    private String name;
    private String imageUrl;
    private Boolean approved;
    private String insurance;
    private BigDecimal odometerKm;
    private LocalDate lastInspectionDate;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
