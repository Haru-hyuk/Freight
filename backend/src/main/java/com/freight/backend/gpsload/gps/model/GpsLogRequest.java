package com.freight.backend.gpsmiss.gps.model;

/**
 * 기사 GPS 위치 전송 요청 DTO
 */
public record GpsLogRequest(
        Double lat,       // 위도 (필수)
        Double lng,       // 경도 (필수)
        Double speedKmh,  // 속도 km/h (선택)
        Double bearing     // 방위각 (선택)
) {
    /**
     * 유효성 검증
     */
    public boolean isValid() {
        return lat != null && lng != null
                && lat >= -90 && lat <= 90
                && lng >= -180 && lng <= 180;
    }
}
