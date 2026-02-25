package com.freight.backend.gpsmiss.routeassembly.model;

/**
 * 조립 알고리즘 파라미터
 * 필터링 및 점수화에 사용되는 임계값과 가중치
 */
public record AssemblyParameters(
        // 필터링 파라미터
        double radiusKm,              // 검색 반경 (km)
        double directionAngleDegrees, // 방향 유사도 허용 각도 (도)
        int maxCombineCount,          // 최대 합짐 개수

        // 점수화 가중치
        double consolidationWeight,   // 합짐 효율 가중치
        double profitWeight,          // 수익 가중치
        double routeWeight,           // 경로 효율 가중치

        // 수익 계산 파라미터
        double fuelCostPerKm,         // km당 유류비
        double baseHourlyCost,        // 시간당 기본 비용

        // 결과 제한
        int maxRecommendations        // 최대 추천 개수
) {
    /**
     * 기본 파라미터 생성
     */
    public static AssemblyParameters defaults() {
        return new AssemblyParameters(
                15.0,   // 15km 반경
                60.0,   // 60도 이내
                3,      // 최대 3건 합짐
                0.35,   // 합짐 효율 35%
                0.40,   // 수익 40%
                0.25,   // 경로 효율 25%
                300.0,  // 300원/km 유류비
                15000.0,// 15,000원/시간
                10      // 상위 10개 추천
        );
    }

    /**
     * 반경 파라미터만 변경
     */
    public AssemblyParameters withRadius(double radiusKm) {
        return new AssemblyParameters(
                radiusKm, directionAngleDegrees, maxCombineCount,
                consolidationWeight, profitWeight, routeWeight,
                fuelCostPerKm, baseHourlyCost, maxRecommendations
        );
    }

    /**
     * 가중치 합이 1인지 검증
     */
    public boolean isValidWeights() {
        double sum = consolidationWeight + profitWeight + routeWeight;
        return Math.abs(sum - 1.0) < 0.001;
    }
}
