package com.freight.backend.controller;
import com.freight.backend.dto.algorithm.LoadPlanPreviewRequest;
import com.freight.backend.dto.algorithm.RouteRecommendRequest;
import com.freight.backend.exception.CustomException;
import com.freight.backend.exception.ErrorCode;
import com.freight.backend.service.AlgorithmGatewayService;
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
 * 기사용 경로 최적화 / 적재 계획 API
 * - 경로 추천
 * - 3D 적재 계획 미리보기
 */
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/driver/optimization")
public class DriverOptimizationController {

    private final AlgorithmGatewayService algorithmGatewayService;

    /** 현재 위치 기반 최적 경로/합짐 추천 */
    @PostMapping("/route-recommendations")
    public ResponseEntity<Object> recommendRoutes(
            @AuthenticationPrincipal UserDetails userDetails,
            @Valid @RequestBody RouteRecommendRequest request
    ) {
        Long driverId = requireDriverId(userDetails);
        return ResponseEntity.ok(algorithmGatewayService.recommendRoutes(driverId, request));
    }

    /** 3D 적재 계획 미리보기 (LIFO 기반) */
    @PostMapping("/load-plan-preview")
    public ResponseEntity<Object> previewLoadPlan(
            @AuthenticationPrincipal UserDetails userDetails,
            @Valid @RequestBody LoadPlanPreviewRequest request
    ) {
        Long driverId = requireDriverId(userDetails);
        return ResponseEntity.ok(algorithmGatewayService.previewLoadPlan(driverId, request));
    }

    private static Long requireDriverId(UserDetails userDetails) {
        if (userDetails == null || !userDetails.getAuthorities().contains(new SimpleGrantedAuthority("ROLE_DRIVER"))) {
            throw new CustomException(ErrorCode.AUTH_FORBIDDEN);
        }
        return Long.parseLong(userDetails.getUsername());
    }
}
