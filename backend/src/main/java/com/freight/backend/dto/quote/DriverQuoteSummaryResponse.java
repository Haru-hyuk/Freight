package com.freight.backend.dto.quote;

import java.time.LocalDateTime;
import java.util.List;

public class DriverQuoteSummaryResponse {
    private final Long quoteId;
    private final String originAddress;
    private final String destinationAddress;
    private final Double originLat;
    private final Double originLng;
    private final Double destinationLat;
    private final Double destinationLng;
    private final String cargoName;
    private final String cargoType;
    private final String cargoDesc;
    private final Integer finalPrice;
    private final Integer distanceKm;
    private final Integer weightKg;
    private final Integer volumeCbm;
    private final Integer itemCount;
    private final Boolean allowCombine;
    private final String vehicleType;
    private final String vehicleBodyType;
    private final String loadMethod;
    private final String unloadMethod;
    private final LocalDateTime pickupScheduleStart;
    private final LocalDateTime deliveryDeadline;
    private final LocalDateTime deliverySchedule;
    private final String status;
    private final LocalDateTime createdAt;
    private final LocalDateTime updatedAt;
    private final List<QuoteItemResponse> quoteItems;
    private final List<QuoteChecklistItemResponse> checklistItems;
    private final List<QuoteStopResponse> stops;

    public DriverQuoteSummaryResponse(
            Long quoteId,
            String originAddress,
            String destinationAddress,
            Double originLat,
            Double originLng,
            Double destinationLat,
            Double destinationLng,
            String cargoName,
            String cargoType,
            String cargoDesc,
            Integer finalPrice,
            Integer distanceKm,
            Integer weightKg,
            Integer volumeCbm,
            Integer itemCount,
            Boolean allowCombine,
            String vehicleType,
            String vehicleBodyType,
            String loadMethod,
            String unloadMethod,
            LocalDateTime pickupScheduleStart,
            LocalDateTime deliveryDeadline,
            LocalDateTime deliverySchedule,
            String status,
            LocalDateTime createdAt,
            LocalDateTime updatedAt,
            List<QuoteItemResponse> quoteItems,
            List<QuoteChecklistItemResponse> checklistItems,
            List<QuoteStopResponse> stops
    ) {
        this.quoteId = quoteId;
        this.originAddress = originAddress;
        this.destinationAddress = destinationAddress;
        this.originLat = originLat;
        this.originLng = originLng;
        this.destinationLat = destinationLat;
        this.destinationLng = destinationLng;
        this.cargoName = cargoName;
        this.cargoType = cargoType;
        this.cargoDesc = cargoDesc;
        this.finalPrice = finalPrice;
        this.distanceKm = distanceKm;
        this.weightKg = weightKg;
        this.volumeCbm = volumeCbm;
        this.itemCount = itemCount;
        this.allowCombine = allowCombine;
        this.vehicleType = vehicleType;
        this.vehicleBodyType = vehicleBodyType;
        this.loadMethod = loadMethod;
        this.unloadMethod = unloadMethod;
        this.pickupScheduleStart = pickupScheduleStart;
        this.deliveryDeadline = deliveryDeadline;
        this.deliverySchedule = deliverySchedule;
        this.status = status;
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
        this.quoteItems = quoteItems;
        this.checklistItems = checklistItems;
        this.stops = stops;
    }

    public Long getQuoteId() { return quoteId; }
    public String getOriginAddress() { return originAddress; }
    public String getDestinationAddress() { return destinationAddress; }
    public Double getOriginLat() { return originLat; }
    public Double getOriginLng() { return originLng; }
    public Double getDestinationLat() { return destinationLat; }
    public Double getDestinationLng() { return destinationLng; }
    public String getCargoName() { return cargoName; }
    public String getCargoType() { return cargoType; }
    public String getCargoDesc() { return cargoDesc; }
    public Integer getFinalPrice() { return finalPrice; }
    public Integer getDistanceKm() { return distanceKm; }
    public Integer getWeightKg() { return weightKg; }
    public Integer getVolumeCbm() { return volumeCbm; }
    public Integer getItemCount() { return itemCount; }
    public Boolean getAllowCombine() { return allowCombine; }
    public String getVehicleType() { return vehicleType; }
    public String getVehicleBodyType() { return vehicleBodyType; }
    public String getLoadMethod() { return loadMethod; }
    public String getUnloadMethod() { return unloadMethod; }
    public LocalDateTime getPickupScheduleStart() { return pickupScheduleStart; }
    public LocalDateTime getDeliveryDeadline() { return deliveryDeadline; }
    public LocalDateTime getDeliverySchedule() { return deliverySchedule; }
    public String getStatus() { return status; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public List<QuoteItemResponse> getQuoteItems() { return quoteItems; }
    public List<QuoteChecklistItemResponse> getChecklistItems() { return checklistItems; }
    public List<QuoteStopResponse> getStops() { return stops; }
}
