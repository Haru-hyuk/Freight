package com.freight.backend.dto.quote;

import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;
import java.time.LocalDateTime;
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

    @Size(max = 255, message = "출발지 상세주소는 255자 이하이어야 합니다")
    private String originAddressDetail;

    @NotBlank(message = "도착지 주소는 필수입니다")
    @Size(max = 255, message = "도착지 주소는 255자 이하이어야 합니다")
    private String destinationAddress;

    @Size(max = 255, message = "도착지 상세주소는 255자 이하이어야 합니다")
    private String destinationAddressDetail;

    @Size(max = 100, message = "보내는 분 이름은 100자 이하이어야 합니다")
    private String senderName;

    @Size(max = 50, message = "보내는 분 연락처는 50자 이하이어야 합니다")
    private String senderPhone;

    @Size(max = 100, message = "받는 분 이름은 100자 이하이어야 합니다")
    private String receiverName;

    @Size(max = 50, message = "받는 분 연락처는 50자 이하이어야 합니다")
    private String receiverPhone;

    @DecimalMin(value = "-90.0", message = "위도는 -90 이상이어야 합니다")
    @DecimalMax(value = "90.0", message = "위도는 90 이하이어야 합니다")
    private Double originLat;

    @DecimalMin(value = "-180.0", message = "경도는 -180 이상이어야 합니다")
    @DecimalMax(value = "180.0", message = "경도는 180 이하이어야 합니다")
    private Double originLng;

    @DecimalMin(value = "-90.0", message = "위도는 -90 이상이어야 합니다")
    @DecimalMax(value = "90.0", message = "위도는 90 이하이어야 합니다")
    private Double destinationLat;

    @DecimalMin(value = "-180.0", message = "경도는 -180 이상이어야 합니다")
    @DecimalMax(value = "180.0", message = "경도는 180 이하이어야 합니다")
    private Double destinationLng;

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

    private LocalDateTime pickupScheduleStart;

    private LocalDateTime deliveryDeadline;

    private LocalDateTime deliverySchedule;

    @Valid
    private List<QuoteChecklistItemRequest> checklistItems;

    @Valid
    private List<QuoteItemRequest> quoteItems;

    @Valid
    private List<QuoteStopRequest> stops;
}
