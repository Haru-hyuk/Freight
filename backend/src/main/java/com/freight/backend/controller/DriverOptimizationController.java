package com.freight.backend.controller;
import com.freight.backend.dto.algorithm.LoadPlanPreviewRequest;
import com.freight.backend.dto.algorithm.RouteRecommendRequest;
import com.freight.backend.dto.algorithm.RouteSelectionPreviewRequest;
import com.freight.backend.exception.CustomException;
import com.freight.backend.exception.ErrorCode;
import com.freight.backend.gpsload.routeassembly.model.RouteAssemblyResponse;
import com.freight.backend.service.AlgorithmGatewayService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * 기사 모바일 앱 전용 경로 최적화 / 적재 계획 API
 *
 * <h3>역할</h3>
 * <ul>
 *   <li>기사 모바일 앱에서 사용하는 <b>공식 경로 추천 진입점</b></li>
 *   <li>JWT 인증 필수, ROLE_DRIVER만 허용</li>
 *   <li>AlgorithmGatewayService를 통해 후보 견적 사전 필터링 (거리/용량/좌표)</li>
 * </ul>
 *
 * <h3>vs /api/route-assembly/recommend</h3>
 * <ul>
 *   <li>route-assembly는 내부/관리자용 저수준 API</li>
 *   <li>driver/optimization은 기사 앱에 최적화된 래퍼</li>
 * </ul>
 *
 * @see com.freight.backend.gpsload.routeassembly.api.RouteAssemblyController
 */
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/driver/optimization")
@Tag(name = "Driver Optimization", description = "기사용 경로 최적화 및 적재 계획 API")
public class DriverOptimizationController {

    private final AlgorithmGatewayService algorithmGatewayService;

    @Operation(summary = "경로 추천", description = "현재 위치 기반 최적 경로/합짐 추천")
    @ApiResponse(
            responseCode = "200",
            description = "추천 경로 목록 반환",
            content = @Content(
                    mediaType = "application/json",
                    schema = @Schema(implementation = RouteAssemblyResponse.class)
            )
    )
    @PostMapping("/route-recommendations")
    public ResponseEntity<Object> recommendRoutes(
            @AuthenticationPrincipal UserDetails userDetails,
            @Valid @RequestBody RouteRecommendRequest request
    ) {
        Long driverId = requireDriverId(userDetails);
        return ResponseEntity.ok(algorithmGatewayService.recommendRoutes(driverId, request));
    }

    @Operation(summary = "3D 적재 계획 미리보기", description = "LIFO 기반 3D 적재 배치 계획")
    @ApiResponse(
            responseCode = "200",
            description = "적재 계획 반환 (placements, unplaced, stats, truck)",
            content = @Content(mediaType = "application/json")
    )
    @PostMapping("/load-plan-preview")
    public ResponseEntity<Object> previewLoadPlan(
            @AuthenticationPrincipal UserDetails userDetails,
            @Valid @RequestBody LoadPlanPreviewRequest request
    ) {
        Long driverId = requireDriverId(userDetails);
        return ResponseEntity.ok(algorithmGatewayService.previewLoadPlan(driverId, request));
    }

    @Operation(
            summary = "노선 선택 미리보기(비수락)",
            description = "추천 노선/수동 선택 견적에 대해 지도·적재순서·3D 적재 계획을 반환하며 수락은 수행하지 않습니다."
    )
    @ApiResponse(
            responseCode = "200",
            description = "노선 상세 미리보기 반환 (수락은 별도 /api/route-assembly/accept)",
            content = @Content(mediaType = "application/json")
    )
    @PostMapping("/route-selection-preview")
    public ResponseEntity<Object> previewRouteSelection(
            @AuthenticationPrincipal UserDetails userDetails,
            @Valid @RequestBody RouteSelectionPreviewRequest request
    ) {
        Long driverId = requireDriverId(userDetails);
        return ResponseEntity.ok(algorithmGatewayService.previewRouteSelection(driverId, request));
    }

    private static Long requireDriverId(UserDetails userDetails) {
        if (userDetails == null || !userDetails.getAuthorities().contains(new SimpleGrantedAuthority("ROLE_DRIVER"))) {
            throw new CustomException(ErrorCode.AUTH_FORBIDDEN);
        }
        return Long.parseLong(userDetails.getUsername());
    }
}
