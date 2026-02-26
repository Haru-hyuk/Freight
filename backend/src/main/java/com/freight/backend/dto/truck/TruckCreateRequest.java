package com.freight.backend.dto.truck;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PastOrPresent;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;
import java.time.LocalDate;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class TruckCreateRequest {

    @NotBlank(message = "차량 종류는 필수입니다")
    private String vehicleType;

    @NotBlank(message = "차량 적재함 타입은 필수입니다")
    private String vehicleBodyType;

    @NotNull(message = "톤수는 필수입니다")
    @Positive(message = "톤수는 양수여야 합니다")
    private BigDecimal tonnage;

    @NotNull(message = "최대 적재 무게는 필수입니다")
    @Positive(message = "최대 적재 무게는 양수여야 합니다")
    private BigDecimal maxWeight;

    @Positive(message = "최대 적재 부피는 양수여야 합니다")
    private BigDecimal maxVolume;

    @Positive(message = "적재함 길이는 양수여야 합니다")
    private BigDecimal cargoLength;

    @Positive(message = "적재함 너비는 양수여야 합니다")
    private BigDecimal cargoWidth;

    @Positive(message = "적재함 높이는 양수여야 합니다")
    private BigDecimal cargoHeight;

    @NotBlank(message = "차량 번호는 필수입니다")
    @Size(max = 20, message = "차량 번호는 20자 이하이어야 합니다")
    private String name;

    private String imageUrl;

    private Boolean approved;

    @NotBlank(message = "보험 정보는 필수입니다")
    private String insurance;

    @PositiveOrZero(message = "주행거리는 0 이상이어야 합니다")
    private BigDecimal odometerKm;

    @PastOrPresent(message = "검사일은 과거 또는 현재 날짜여야 합니다")
    private LocalDate lastInspectionDate;
}
