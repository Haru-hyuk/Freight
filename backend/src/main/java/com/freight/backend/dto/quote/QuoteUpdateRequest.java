package com.freight.backend.dto.quote;

import java.util.List;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class QuoteUpdateRequest {
    private Long truckId;
    private String originAddress;
    private String destinationAddress;
    private Double originLat;
    private Double originLng;
    private Double destinationLat;
    private Double destinationLng;
    private Integer distanceKm;
    private Integer weightKg;
    private Integer volumeCbm;
    private String vehicleType;
    private String cargoName;
    private String cargoType;
    private String cargoDesc;
    private Integer basePrice;
    private Integer distancePrice;
    private Integer desiredPrice;
    private Boolean allowCombine;
    private String loadMethod;
    private String unloadMethod;
    private List<QuoteChecklistItemRequest> checklistItems;
}
