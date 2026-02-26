package com.freight.backend.gpsload.tracking.dto;

import java.time.LocalDateTime;
import java.util.List;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
@AllArgsConstructor
public class TrackingResponse {
    private Long matchId;
    private String matchStatus;
    private Boolean locationSharingEnabled;
    private LocalDateTime locationSharingUpdatedAt;
    private LocalDateTime lastReceivedAt;
    private Boolean missingSignalWarning;
    private DriverLocation currentLocation;
    private List<HistoryPoint> recentPath;

    @Getter
    @Builder
    @AllArgsConstructor
    public static class DriverLocation {
        private Double lat;
        private Double lng;
        private Double speedKmh;
        private Double bearing;
        private LocalDateTime loggedAt;
    }

    @Getter
    @Builder
    @AllArgsConstructor
    public static class HistoryPoint {
        private Double lat;
        private Double lng;
        private LocalDateTime loggedAt;
    }
}
