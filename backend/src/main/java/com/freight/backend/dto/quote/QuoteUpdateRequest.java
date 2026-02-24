package com.freight.backend.dto.quote;

import java.util.List;

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
    private List<QuoteChecklistItemRequest> checklistItems;
    private List<QuoteItemRequest> quoteItems;
    private List<QuoteStopRequest> stops;

    public Long getTruckId() { return truckId; }
    public void setTruckId(Long truckId) { this.truckId = truckId; }
    public String getOriginAddress() { return originAddress; }
    public void setOriginAddress(String originAddress) { this.originAddress = originAddress; }
    public String getDestinationAddress() { return destinationAddress; }
    public void setDestinationAddress(String destinationAddress) { this.destinationAddress = destinationAddress; }
    public Double getOriginLat() { return originLat; }
    public void setOriginLat(Double originLat) { this.originLat = originLat; }
    public Double getOriginLng() { return originLng; }
    public void setOriginLng(Double originLng) { this.originLng = originLng; }
    public Double getDestinationLat() { return destinationLat; }
    public void setDestinationLat(Double destinationLat) { this.destinationLat = destinationLat; }
    public Double getDestinationLng() { return destinationLng; }
    public void setDestinationLng(Double destinationLng) { this.destinationLng = destinationLng; }
    public Integer getDistanceKm() { return distanceKm; }
    public void setDistanceKm(Integer distanceKm) { this.distanceKm = distanceKm; }
    public Integer getWeightKg() { return weightKg; }
    public void setWeightKg(Integer weightKg) { this.weightKg = weightKg; }
    public Integer getVolumeCbm() { return volumeCbm; }
    public void setVolumeCbm(Integer volumeCbm) { this.volumeCbm = volumeCbm; }
    public String getVehicleType() { return vehicleType; }
    public void setVehicleType(String vehicleType) { this.vehicleType = vehicleType; }
    public String getVehicleBodyType() { return vehicleBodyType; }
    public void setVehicleBodyType(String vehicleBodyType) { this.vehicleBodyType = vehicleBodyType; }
    public String getCargoName() { return cargoName; }
    public void setCargoName(String cargoName) { this.cargoName = cargoName; }
    public String getCargoType() { return cargoType; }
    public void setCargoType(String cargoType) { this.cargoType = cargoType; }
    public String getCargoDesc() { return cargoDesc; }
    public void setCargoDesc(String cargoDesc) { this.cargoDesc = cargoDesc; }
    public Integer getBasePrice() { return basePrice; }
    public void setBasePrice(Integer basePrice) { this.basePrice = basePrice; }
    public Integer getDistancePrice() { return distancePrice; }
    public void setDistancePrice(Integer distancePrice) { this.distancePrice = distancePrice; }
    public Integer getDesiredPrice() { return desiredPrice; }
    public void setDesiredPrice(Integer desiredPrice) { this.desiredPrice = desiredPrice; }
    public Boolean getAllowCombine() { return allowCombine; }
    public void setAllowCombine(Boolean allowCombine) { this.allowCombine = allowCombine; }
    public String getLoadMethod() { return loadMethod; }
    public void setLoadMethod(String loadMethod) { this.loadMethod = loadMethod; }
    public String getUnloadMethod() { return unloadMethod; }
    public void setUnloadMethod(String unloadMethod) { this.unloadMethod = unloadMethod; }
    public List<QuoteChecklistItemRequest> getChecklistItems() { return checklistItems; }
    public void setChecklistItems(List<QuoteChecklistItemRequest> checklistItems) { this.checklistItems = checklistItems; }
    public List<QuoteItemRequest> getQuoteItems() { return quoteItems; }
    public void setQuoteItems(List<QuoteItemRequest> quoteItems) { this.quoteItems = quoteItems; }
    public List<QuoteStopRequest> getStops() { return stops; }
    public void setStops(List<QuoteStopRequest> stops) { this.stops = stops; }
}
