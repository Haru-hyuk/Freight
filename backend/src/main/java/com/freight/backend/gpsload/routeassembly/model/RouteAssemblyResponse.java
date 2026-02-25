package com.freight.backend.gpsmiss.routeassembly.model;

import java.util.List;

/**
 * 노선 조립 응답
 * 추천 노선 목록과 메타 정보
 */
public record RouteAssemblyResponse(
        boolean success,                        // 성공 여부
        String message,                         // 결과 메시지
        List<RecommendedRoute> recommendations, // 추천 노선 목록
        int totalCandidates,                    // 총 후보 견적 수
        int filteredCandidates,                 // 필터 후 남은 견적 수
        int combinationsEvaluated,              // 평가된 조합 수
        long processingTimeMs                   // 처리 시간 (ms)
) {
    /**
     * 성공 응답 생성
     */
    public static RouteAssemblyResponse success(
            List<RecommendedRoute> recommendations,
            int totalCandidates,
            int filteredCandidates,
            int combinationsEvaluated,
            long processingTimeMs
    ) {
        String message = String.format(
                "%d개의 추천 노선을 찾았습니다. (후보: %d개, 필터 후: %d개, 평가 조합: %d개)",
                recommendations.size(), totalCandidates, filteredCandidates, combinationsEvaluated
        );
        return new RouteAssemblyResponse(
                true, message, recommendations,
                totalCandidates, filteredCandidates, combinationsEvaluated, processingTimeMs
        );
    }

    /**
     * 실패 응답 생성
     */
    public static RouteAssemblyResponse failure(String errorMessage) {
        return new RouteAssemblyResponse(
                false, errorMessage, List.of(),
                0, 0, 0, 0
        );
    }

    /**
     * 빈 결과 응답 생성
     */
    public static RouteAssemblyResponse empty(String reason, int totalCandidates) {
        return new RouteAssemblyResponse(
                true, reason, List.of(),
                totalCandidates, 0, 0, 0
        );
    }

    /**
     * 추천 결과가 있는지 확인
     */
    public boolean hasRecommendations() {
        return recommendations != null && !recommendations.isEmpty();
    }

    /**
     * 최상위 추천 가져오기
     */
    public RecommendedRoute topRecommendation() {
        if (!hasRecommendations()) return null;
        return recommendations.get(0);
    }
}
