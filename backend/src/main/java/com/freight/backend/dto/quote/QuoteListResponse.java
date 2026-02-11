package com.freight.backend.dto.quote;

import java.time.LocalDateTime;
import lombok.AllArgsConstructor;
import lombok.Getter;

@Getter
@AllArgsConstructor
public class QuoteListResponse {
    private Long quoteId;
    private Long truckId;
    private String originAddress;
    private String destinationAddress;
    private Integer distanceKm;
    private String vehicleType;
    private String cargoName;
    private Integer desiredPrice;
    private Integer finalPrice;
    private String status;
    private LocalDateTime createdAt;
}
