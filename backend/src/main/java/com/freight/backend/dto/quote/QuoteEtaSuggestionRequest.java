package com.freight.backend.dto.quote;

import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.time.LocalDateTime;
import java.util.List;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class QuoteEtaSuggestionRequest {

    @NotBlank(message = "출발지 주소는 필수입니다")
    @Size(max = 255, message = "출발지 주소는 255자 이하이어야 합니다")
    private String originAddress;

    @NotBlank(message = "도착지 주소는 필수입니다")
    @Size(max = 255, message = "도착지 주소는 255자 이하이어야 합니다")
    private String destinationAddress;

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

    @Valid
    private List<QuoteStopRequest> stops;

    @NotNull(message = "상차 시작 시각은 필수입니다")
    private LocalDateTime pickupScheduleStart;
}
