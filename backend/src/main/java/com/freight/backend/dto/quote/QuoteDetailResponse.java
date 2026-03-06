package com.freight.backend.dto.quote;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import lombok.AllArgsConstructor;
import lombok.Getter;

@Getter
@AllArgsConstructor
public class QuoteDetailResponse {
    private Long quoteId;
    private UUID quotePublicId;
    private Long shipperId;
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
    private Integer extraPrice;
    private Integer desiredPrice;
    private Integer finalPrice;
    private Boolean allowCombine;
    private String loadMethod;
    private String unloadMethod;
    private LocalDateTime pickupScheduleStart;
    private LocalDateTime deliveryDeadline;
    private LocalDateTime deliverySchedule;
    private String status;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private List<QuoteItemResponse> quoteItems;
    private List<QuoteChecklistItemResponse> checklistItems;
    private List<QuoteStopResponse> stops;
}
