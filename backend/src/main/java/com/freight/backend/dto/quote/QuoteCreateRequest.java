package com.freight.backend.dto.quote;

import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;
import java.util.List;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class QuoteCreateRequest {

    private Long truckId;

    @NotBlank(message = "출발지 주소는 필수입니다")
    @Size(max = 255, message = "출발지 주소는 255자 이하이어야 합니다")
    private String originAddress;

    @NotBlank(message = "도착지 주소는 필수입니다")
    @Size(max = 255, message = "도착지 주소는 255자 이하이어야 합니다")
    private String destinationAddress;

    @NotNull(message = "출발지 위도는 필수입니다")
    @DecimalMin(value = "-90.0", message = "위도는 -90 이상이어야 합니다")
    @DecimalMax(value = "90.0", message = "위도는 90 이하이어야 합니다")
    private Double originLat;

    @NotNull(message = "출발지 경도는 필수입니다")
    @DecimalMin(value = "-180.0", message = "경도는 -180 이상이어야 합니다")
    @DecimalMax(value = "180.0", message = "경도는 180 이하이어야 합니다")
    private Double originLng;

    @NotNull(message = "도착지 위도는 필수입니다")
    @DecimalMin(value = "-90.0", message = "위도는 -90 이상이어야 합니다")
    @DecimalMax(value = "90.0", message = "위도는 90 이하이어야 합니다")
    private Double destinationLat;

    @NotNull(message = "도착지 경도는 필수입니다")
    @DecimalMin(value = "-180.0", message = "경도는 -180 이상이어야 합니다")
    @DecimalMax(value = "180.0", message = "경도는 180 이하이어야 합니다")
    private Double destinationLng;

    @NotNull(message = "거리는 필수입니다")
    @Min(value = 1, message = "거리는 1km 이상이어야 합니다")
    private Integer distanceKm;

    @NotNull(message = "화물 무게는 필수입니다")
    @Min(value = 1, message = "화물 무게는 1kg 이상이어야 합니다")
    private Integer weightKg;

    @PositiveOrZero(message = "부피는 0 이상이어야 합니다")
    private Integer volumeCbm;

    @NotBlank(message = "차량 종류는 필수입니다")
    private String vehicleType;

    @NotBlank(message = "차량 적재함 타입은 필수입니다")
    private String vehicleBodyType;

    @NotBlank(message = "화물명은 필수입니다")
    @Size(max = 100, message = "화물명은 100자 이하이어야 합니다")
    private String cargoName;

    @NotBlank(message = "화물 종류는 필수입니다")
    private String cargoType;

    @Size(max = 500, message = "화물 설명은 500자 이하이어야 합니다")
    private String cargoDesc;

    @NotNull(message = "기본 운임은 필수입니다")
    @PositiveOrZero(message = "기본 운임은 0 이상이어야 합니다")
    private Integer basePrice;

    @PositiveOrZero(message = "거리 운임은 0 이상이어야 합니다")
    private Integer distancePrice;

    @PositiveOrZero(message = "희망 운임은 0 이상이어야 합니다")
    private Integer desiredPrice;

    private Boolean allowCombine;

    @NotBlank(message = "상차 방법은 필수입니다")
    private String loadMethod;

    @NotBlank(message = "하차 방법은 필수입니다")
    private String unloadMethod;

    @Valid
    private List<QuoteChecklistItemRequest> checklistItems;

    @Valid
    private List<QuoteItemRequest> quoteItems;

    @Valid
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
