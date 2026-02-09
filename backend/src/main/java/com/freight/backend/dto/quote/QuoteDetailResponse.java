package com.freight.backend.dto.quote;

import java.time.LocalDateTime;
import java.util.List;
import lombok.AllArgsConstructor;
import lombok.Getter;

@Getter
@AllArgsConstructor
public class QuoteDetailResponse {
    private Long quoteId;
    private Long shipperId;
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
    private String cargoType;
    private String cargoDesc;
    private Integer basePrice;
    private Integer distancePrice;
    private Integer extraPrice;
    private Integer desiredPrice;
    private Integer finalPrice;
    private Boolean allowCombine;
    private String loadMethod;
    private String unloadMethod;
    private String status;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private List<QuoteChecklistItemResponse> checklistItems;
}
