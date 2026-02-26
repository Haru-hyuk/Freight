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
    @Size(max = 255, message = "출발지 주소는 255자 이하여야 합니다")
    private String originAddress;

    @NotBlank(message = "도착지 주소는 필수입니다")
    @Size(max = 255, message = "도착지 주소는 255자 이하여야 합니다")
    private String destinationAddress;

    // Optional: if absent, backend geocoding resolves from address.
    @DecimalMin(value = "-90.0", message = "위도는 -90 이상이어야 합니다")
    @DecimalMax(value = "90.0", message = "위도는 90 이하여야 합니다")
    private Double originLat;

    @DecimalMin(value = "-180.0", message = "경도는 -180 이상이어야 합니다")
    @DecimalMax(value = "180.0", message = "경도는 180 이하여야 합니다")
    private Double originLng;

    @DecimalMin(value = "-90.0", message = "위도는 -90 이상이어야 합니다")
    @DecimalMax(value = "90.0", message = "위도는 90 이하여야 합니다")
    private Double destinationLat;

    @DecimalMin(value = "-180.0", message = "경도는 -180 이상이어야 합니다")
    @DecimalMax(value = "180.0", message = "경도는 180 이하여야 합니다")
    private Double destinationLng;

    // Optional: backend can calculate route distance.
    @Min(value = 1, message = "거리는 1km 이상이어야 합니다")
    private Integer distanceKm;

    @NotNull(message = "화물 무게는 필수입니다")
    @Min(value = 1, message = "화물 무게는 1kg 이상이어야 합니다")
    private Integer weightKg;

    @PositiveOrZero(message = "부피는 0 이상이어야 합니다")
    private Integer volumeCbm;

    @NotBlank(message = "차량 종류는 필수입니다")
    private String vehicleType;

    @NotBlank(message = "차량 적재 타입은 필수입니다")
    private String vehicleBodyType;

    @NotBlank(message = "화물명은 필수입니다")
    @Size(max = 100, message = "화물명은 100자 이하여야 합니다")
    private String cargoName;

    @NotBlank(message = "화물 종류는 필수입니다")
    private String cargoType;

    @Size(max = 500, message = "화물 설명은 500자 이하여야 합니다")
    private String cargoDesc;

    // Optional: backend pricing calculation fills this.
    @PositiveOrZero(message = "기본 운임은 0 이상이어야 합니다")
    private Integer basePrice;

    @PositiveOrZero(message = "거리 운임은 0 이상이어야 합니다")
    private Integer distancePrice;

    @PositiveOrZero(message = "희망 운임은 0 이상이어야 합니다")
    private Integer desiredPrice;

    private Boolean allowCombine;

    @NotBlank(message = "상차 방식은 필수입니다")
    private String loadMethod;

    @NotBlank(message = "하차 방식은 필수입니다")
    private String unloadMethod;

    @Valid
    private List<QuoteChecklistItemRequest> checklistItems;

    @Valid
    private List<QuoteItemRequest> quoteItems;

    @Valid
    private List<QuoteStopRequest> stops;
}
