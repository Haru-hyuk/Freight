package com.freight.backend.gpsmiss.routeassembly.model;

import java.util.List;

/**
 * 노선 조립 요청
 * 기사가 추천을 요청할 때 보내는 정보
 */
public record RouteAssemblyRequest(
        DriverState driverState,       // 기사 상태
        List<Quote> candidateQuotes,   // 후보 견적 목록 (선택적)
        AssemblyParameters parameters, // 알고리즘 파라미터 (선택적)
        List<Long> selectedQuoteIds,   // 기사가 미리 선택한 견적 ID (선택적)
        RouteMode mode                 // 노선 모드 (SIMPLE / SMART, 선택적)
) {
    /**
     * 노선 모드 열거형 — HTML 프론트엔드 이전
     * SIMPLE: 순차 왕복 (현재→상차1→하차1→상차2→하차2→...→복귀)
     * SMART : LIFO 알뜰배달 (현재→상차1→상차2→...→하차N→...→하차1→복귀)
     */
    public enum RouteMode {
        SIMPLE,
        SMART
    }

    /**
     * 파라미터가 없으면 기본값 사용
     */
    public AssemblyParameters getEffectiveParameters() {
        return parameters != null ? parameters : AssemblyParameters.defaults();
    }

    /**
     * 유효한 모드 반환 (null이면 SMART 기본)
     */
    public RouteMode getEffectiveMode() {
        return mode != null ? mode : RouteMode.SMART;
    }

    /**
     * 유효성 검증
     */
    public boolean isValid() {
        if (driverState == null) return false;
        if (driverState.currentLocation() == null) return false;
        if (driverState.currentLocation().latitude() == null) return false;
        if (driverState.currentLocation().longitude() == null) return false;
        return true;
    }

    /**
     * 후보 견적이 제공되었는지 확인
     */
    public boolean hasCandidateQuotes() {
        return candidateQuotes != null && !candidateQuotes.isEmpty();
    }

    /**
     * 선택된 견적이 있는지 확인
     */
    public boolean hasSelectedQuotes() {
        return selectedQuoteIds != null && !selectedQuoteIds.isEmpty();
    }
}
