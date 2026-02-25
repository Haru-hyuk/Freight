package com.freight.backend.gpsload.gps.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;

/**
 * GPS 로그 엔티티 — gps_logs 테이블 매핑.
 * match 단위로 기사가 전송한 GPS 로그.
 */
@Entity(name = "GpsTrackingLog")
@Table(name = "gps_logs")
public class GpsLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "gps_log_id")
    private Long gpsLogId;

    @Column(name = "match_id", nullable = false)
    private Long matchId;

    @Column(name = "driver_id", nullable = false)
    private Long driverId;

    @Column(name = "lat", nullable = false)
    private Double lat;

    @Column(name = "lng", nullable = false)
    private Double lng;

    @Column(name = "speed_kmh")
    private Double speedKmh;

    @Column(name = "bearing")
    private Double bearing;

    @Column(name = "is_deviation", nullable = false)
    private Boolean isDeviation = false;

    @Column(name = "deviation_distance_m")
    private Double deviationDistanceM;

    @Column(name = "logged_at", nullable = false)
    private LocalDateTime loggedAt;

    // JPA 기본 생성자
    protected GpsLog() {}

    public GpsLog(Long matchId, Long driverId, Double lat, Double lng,
                  Double speedKmh, Double bearing, LocalDateTime loggedAt) {
        this.matchId = matchId;
        this.driverId = driverId;
        this.lat = lat;
        this.lng = lng;
        this.speedKmh = speedKmh;
        this.bearing = bearing;
        this.loggedAt = loggedAt;
        this.isDeviation = false;
    }

    // Getters
    public Long getGpsLogId() { return gpsLogId; }
    public Long getMatchId() { return matchId; }
    public Long getDriverId() { return driverId; }
    public Double getLat() { return lat; }
    public Double getLng() { return lng; }
    public Double getSpeedKmh() { return speedKmh; }
    public Double getBearing() { return bearing; }
    public Boolean getIsDeviation() { return isDeviation; }
    public Double getDeviationDistanceM() { return deviationDistanceM; }
    public LocalDateTime getLoggedAt() { return loggedAt; }

    // Setters (이탈 판정 시 갱신)
    public void markDeviation(double deviationDistanceM) {
        this.isDeviation = true;
        this.deviationDistanceM = deviationDistanceM;
    }

    public void clearDeviation() {
        this.isDeviation = false;
        this.deviationDistanceM = null;
    }
}
