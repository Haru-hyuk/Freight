package com.freight.backend.dto.algorithm;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import java.util.List;
import lombok.Getter;
import lombok.Setter;

/**
 * 기사 앱 노선 선택 미리보기 요청.
 *
 * <p>추천 노선을 선택했을 때 즉시 수락하지 않고,
 * 지도/적재순서/3D 적재 미리보기를 위한 데이터를 반환한다.</p>
 */
@Getter
@Setter
public class RouteSelectionPreviewRequest {

    @NotNull
    @DecimalMin(value = "-90.0")
    @DecimalMax(value = "90.0")
    private Double currentLat;

    @NotNull
    @DecimalMin(value = "-180.0")
    @DecimalMax(value = "180.0")
    private Double currentLng;

    @DecimalMin(value = "-90.0")
    @DecimalMax(value = "90.0")
    private Double endLat;

    @DecimalMin(value = "-180.0")
    @DecimalMax(value = "180.0")
    private Double endLng;

    // ALLOW, DISALLOW, HOME_ROUTE
    private String combinePreference;

    // SIMPLE, SMART
    private String mode;

    @DecimalMin(value = "0.0")
    private Double loadedWeightKg;

    @DecimalMin(value = "0.0")
    private Double loadedVolumeCbm;

    @DecimalMin(value = "0.0")
    private Double maxPickupDistanceKm;

    private Integer maxCombineCount;
    private Integer maxRecommendations;

    @Min(1)
    private Integer maxVisitCount;

    /**
     * UI에서 선택된 대기 견적 목록.
     */
    @NotEmpty
    private List<Long> quoteIds;

    /**
     * 선택한 추천 노선의 순위(1-based). 미지정 시 최상위 추천 사용.
     */
    @Min(1)
    private Integer selectedRouteRank;

    /**
     * 선택 트럭 ID (있으면 기사 기본 선택 트럭보다 우선)
     */
    private Long truckId;
}
