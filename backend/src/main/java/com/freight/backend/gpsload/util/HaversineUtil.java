package com.freight.backend.gpsload.util;

/**
 * Haversine 공식을 이용한 두 위·경도 간 대권 거리 계산 유틸리티.
 * GPS 추적, 이탈 감지, 경로 계산 등 전역에서 사용.
 */
public final class HaversineUtil {

    /** 지구 반경 (미터) */
    private static final double EARTH_RADIUS_M = 6_371_000.0;

    private HaversineUtil() {
        // 유틸리티 클래스 — 인스턴스화 방지
    }

    /**
     * 두 위·경도 간 대권 거리 계산 (미터).
     *
     * @param lat1 출발 위도 (도)
     * @param lon1 출발 경도 (도)
     * @param lat2 도착 위도 (도)
     * @param lon2 도착 경도 (도)
     * @return 거리 (미터)
     */
    public static double distanceInMeters(double lat1, double lon1, double lat2, double lon2) {
        double dLat = Math.toRadians(lat2 - lat1);
        double dLon = Math.toRadians(lon2 - lon1);

        double a = Math.sin(dLat / 2) * Math.sin(dLat / 2)
                 + Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2))
                 * Math.sin(dLon / 2) * Math.sin(dLon / 2);

        double c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

        return EARTH_RADIUS_M * c;
    }

    /**
     * 두 위·경도 간 대권 거리 계산 (킬로미터).
     *
     * @param lat1 출발 위도 (도)
     * @param lon1 출발 경도 (도)
     * @param lat2 도착 위도 (도)
     * @param lon2 도착 경도 (도)
     * @return 거리 (킬로미터)
     */
    public static double distanceInKm(double lat1, double lon1, double lat2, double lon2) {
        return distanceInMeters(lat1, lon1, lat2, lon2) / 1000.0;
    }

    /**
     * 점(P)에서 선분(A→B)까지의 최소 거리 (미터).
     * 직각 투영이 선분 범위 안이면 수선의 발까지 거리,
     * 범위 밖이면 A 또는 B까지 거리 중 작은 값을 반환.
     *
     * 근거리 평면 근사(equirectangular projection) 사용 — 수십 km 범위에서 충분히 정확.
     *
     * @param pLat 점 P 위도
     * @param pLon 점 P 경도
     * @param aLat 선분 시작 A 위도
     * @param aLon 선분 시작 A 경도
     * @param bLat 선분 끝 B 위도
     * @param bLon 선분 끝 B 경도
     * @return 거리 (미터)
     */
    public static double pointToSegmentDistanceM(double pLat, double pLon,
                                                  double aLat, double aLon,
                                                  double bLat, double bLon) {
        // 평면 좌표 변환 (equirectangular)
        double cosLat = Math.cos(Math.toRadians((aLat + bLat + pLat) / 3.0));
        double px = (pLon - aLon) * cosLat;
        double py = pLat - aLat;
        double bx = (bLon - aLon) * cosLat;
        double by = bLat - aLat;

        double dot = px * bx + py * by;
        double lenSq = bx * bx + by * by;

        // t = 투영 비율 [0,1]로 클램핑
        double t;
        if (lenSq < 1e-12) {
            t = 0; // A와 B가 같은 점
        } else {
            t = Math.max(0, Math.min(1, dot / lenSq));
        }

        // 수선의 발 좌표
        double closestLat = aLat + t * (bLat - aLat);
        double closestLon = aLon + t * (bLon - aLon);

        return distanceInMeters(pLat, pLon, closestLat, closestLon);
    }
}
