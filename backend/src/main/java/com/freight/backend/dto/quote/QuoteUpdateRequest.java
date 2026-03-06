package com.freight.backend.dto.quote;

import java.time.LocalDateTime;
import java.util.List;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class QuoteUpdateRequest {
    private Long truckId;
    private String originAddress;
    private String originAddressDetail;
    private String destinationAddress;
    private String destinationAddressDetail;
    private String senderName;
    private String senderPhone;
    private String receiverName;
    private String receiverPhone;
    private Double originLat;
    private Double originLng;
    private Double destinationLat;
    private Double destinationLng;
    private Integer distanceKm;
    private Integer weightKg;
    private Integer volumeCbm;
    private String vehicleType;
    private String vehicleBodyType;
    private String cargoName;
    private String cargoType;
    private String cargoDesc;
    private Integer basePrice;
    private Integer distancePrice;
    private Integer desiredPrice;
    private Boolean allowCombine;
    private String loadMethod;
    private String unloadMethod;
    private LocalDateTime pickupScheduleStart;
    private LocalDateTime deliveryDeadline;
    private LocalDateTime deliverySchedule;
    private List<QuoteChecklistItemRequest> checklistItems;
    private List<QuoteItemRequest> quoteItems;
    private List<QuoteStopRequest> stops;
}
