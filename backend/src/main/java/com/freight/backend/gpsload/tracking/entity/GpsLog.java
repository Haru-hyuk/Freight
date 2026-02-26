package com.freight.backend.gpsload.tracking.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "gps_logs")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Builder
public class GpsLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "gps_log_id")
    private Long gpsLogId;

    @Column(name = "match_id", nullable = false)
    private Long matchId;

    @Column(name = "driver_id", nullable = false)
    private Long driverId;

    @Column(name = "lat", nullable = false, precision = 10, scale = 7)
    private BigDecimal lat;

    @Column(name = "lng", nullable = false, precision = 10, scale = 7)
    private BigDecimal lng;

    @Column(name = "speed_kmh", precision = 5, scale = 1)
    private BigDecimal speedKmh;

    @Column(name = "bearing", precision = 5, scale = 2)
    private BigDecimal bearing;

    @Column(name = "is_deviation", nullable = false)
    private Boolean isDeviation;

    @Column(name = "deviation_distance_m")
    private Integer deviationDistanceM;

    @Column(name = "logged_at", nullable = false)
    private LocalDateTime loggedAt;

    @PrePersist
    protected void onCreate() {
        if (isDeviation == null) {
            isDeviation = Boolean.FALSE;
        }
        if (loggedAt == null) {
            loggedAt = LocalDateTime.now();
        }
    }
}
