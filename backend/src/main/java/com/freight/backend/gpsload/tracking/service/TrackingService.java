package com.freight.backend.gpsload.tracking.service;

import com.freight.backend.entity.Match;
import com.freight.backend.exception.CustomException;
import com.freight.backend.exception.ErrorCode;
import com.freight.backend.gpsload.tracking.dto.GpsLogUpsertRequest;
import com.freight.backend.gpsload.tracking.dto.GpsLogUpsertResponse;
import com.freight.backend.gpsload.tracking.dto.TrackingResponse;
import com.freight.backend.gpsload.tracking.dto.TrackingShareStateResponse;
import com.freight.backend.gpsload.tracking.entity.GpsLog;
import com.freight.backend.gpsload.tracking.repository.GpsLogRepository;
import com.freight.backend.gpsload.util.HaversineUtil;
import com.freight.backend.repository.MatchRepository;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.util.Comparator;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * GPS 추적 서비스
 * - 기사 위치 저장 (중복/미세이동 필터링)
 * - 화주 실시간 위치 조회
 * - 위치 공유 ON/OFF
 */
@Service
@RequiredArgsConstructor
public class TrackingService {

    private final MatchRepository matchRepository;
    private final GpsLogRepository gpsLogRepository;

    @Value("${gps.tracking.min-log-interval-seconds:5}")
    private long minLogIntervalSeconds;

    @Value("${gps.tracking.min-move-meters:10}")
    private double minMoveMeters;

    @Value("${gps.tracking.missing-signal-seconds:120}")
    private long missingSignalSeconds;

    @Value("${gps.tracking.max-history-points:100}")
    private int maxHistoryPoints;

    /** 기사 GPS 위치 저장 (중복/미세이동 필터링 포함) */
    @Transactional
    public GpsLogUpsertResponse upsertDriverLocation(Long driverId, Long matchId, GpsLogUpsertRequest request) {
        Match match = matchRepository.findByMatchIdAndDriverId(matchId, driverId)
                .orElseThrow(() -> new CustomException(ErrorCode.AUTH_FORBIDDEN));

        if (match.getStatus() == Match.Status.CANCELLED || match.getStatus() == Match.Status.COMPLETED) {
            throw new CustomException(ErrorCode.INVALID_REQUEST);
        }
        if (match.getStatus() != Match.Status.IN_TRANSIT) {
            throw new CustomException(ErrorCode.INVALID_REQUEST);
        }
        if (!Boolean.TRUE.equals(match.getLocationSharingEnabled())) {
            throw new CustomException(ErrorCode.INVALID_REQUEST);
        }

        LocalDateTime now = LocalDateTime.now();
        GpsLog latest = gpsLogRepository.findTopByMatchIdOrderByLoggedAtDesc(matchId).orElse(null);
        if (latest != null && latest.getLoggedAt() != null && latest.getLoggedAt().isAfter(now.minusSeconds(minLogIntervalSeconds))) {
            double movedMeters = HaversineUtil.distanceInMeters(
                    latest.getLat().doubleValue(), latest.getLng().doubleValue(),
                    request.getLat(), request.getLng()
            );
            if (movedMeters < minMoveMeters) {
                return GpsLogUpsertResponse.builder()
                        .gpsLogId(latest.getGpsLogId())
                        .matchId(matchId)
                        .loggedAt(latest.getLoggedAt())
                        .deduplicated(true)
                        .reason("THROTTLED_NO_MOVEMENT")
                        .build();
            }
        }

        GpsLog saved = gpsLogRepository.save(GpsLog.builder()
                .matchId(matchId)
                .driverId(driverId)
                .lat(toDecimal(request.getLat(), 7))
                .lng(toDecimal(request.getLng(), 7))
                .speedKmh(toNullableDecimal(request.getSpeedKmh(), 1))
                .bearing(toNullableDecimal(request.getBearing(), 2))
                .isDeviation(Boolean.FALSE)
                .deviationDistanceM(null)
                .build());

        return GpsLogUpsertResponse.builder()
                .gpsLogId(saved.getGpsLogId())
                .matchId(saved.getMatchId())
                .loggedAt(saved.getLoggedAt())
                .deduplicated(false)
                .reason("LOGGED")
                .build();
    }

    /** 화주용 실시간 위치 조회 (GPS 끊김 경고 포함) */
    @Transactional(readOnly = true)
    public TrackingResponse getShipperTracking(Long shipperId, Long matchId) {
        Match match = matchRepository.findByMatchIdAndShipperId(matchId, shipperId)
                .orElseThrow(() -> new CustomException(ErrorCode.AUTH_FORBIDDEN));

        int pageSize = Math.max(1, Math.min(maxHistoryPoints, 500));
        List<GpsLog> recentLogs = gpsLogRepository.findByMatchIdOrderByLoggedAtDesc(matchId, PageRequest.of(0, pageSize));

        TrackingResponse.DriverLocation location = recentLogs.stream()
                .max(Comparator.comparing(GpsLog::getLoggedAt))
                .map(log -> TrackingResponse.DriverLocation.builder()
                        .lat(log.getLat().doubleValue())
                        .lng(log.getLng().doubleValue())
                        .speedKmh(log.getSpeedKmh() == null ? null : log.getSpeedKmh().doubleValue())
                        .bearing(log.getBearing() == null ? null : log.getBearing().doubleValue())
                        .loggedAt(log.getLoggedAt())
                        .build())
                .orElse(null);

        boolean sharingEnabled = Boolean.TRUE.equals(match.getLocationSharingEnabled());
        boolean signalMissing = location == null
                || location.getLoggedAt() == null
                || location.getLoggedAt().isBefore(LocalDateTime.now().minusSeconds(missingSignalSeconds));

        List<TrackingResponse.HistoryPoint> recentPath = recentLogs.stream()
                .sorted(Comparator.comparing(GpsLog::getLoggedAt))
                .map(log -> TrackingResponse.HistoryPoint.builder()
                        .lat(log.getLat().doubleValue())
                        .lng(log.getLng().doubleValue())
                        .loggedAt(log.getLoggedAt())
                        .build())
                .toList();

        return TrackingResponse.builder()
                .matchId(match.getMatchId())
                .matchStatus(match.getStatus().name())
                .locationSharingEnabled(sharingEnabled)
                .locationSharingUpdatedAt(match.getLocationSharingUpdatedAt())
                .lastReceivedAt(sharingEnabled && location != null ? location.getLoggedAt() : null)
                .missingSignalWarning(sharingEnabled && signalMissing)
                .currentLocation(sharingEnabled ? location : null)
                .recentPath(sharingEnabled ? recentPath : List.of())
                .build();
    }

    @Transactional
    public TrackingShareStateResponse updateTrackingSharing(Long driverId, Long matchId, boolean enabled) {
        Match match = matchRepository.findByMatchIdAndDriverId(matchId, driverId)
                .orElseThrow(() -> new CustomException(ErrorCode.AUTH_FORBIDDEN));

        if (match.getStatus() == Match.Status.CANCELLED || match.getStatus() == Match.Status.COMPLETED) {
            throw new CustomException(ErrorCode.INVALID_REQUEST);
        }

        match.updateLocationSharing(enabled);
        Match saved = matchRepository.save(match);

        return TrackingShareStateResponse.builder()
                .matchId(saved.getMatchId())
                .enabled(saved.getLocationSharingEnabled())
                .updatedAt(saved.getLocationSharingUpdatedAt())
                .build();
    }

    /**
     * 레거시 GPS 이력 조회 (기사 소유 match 한정).
     */
    @Transactional(readOnly = true)
    public List<GpsLog> getGpsHistoryForDriver(Long driverId, Long matchId, int limit, LocalDateTime since) {
        matchRepository.findByMatchIdAndDriverId(matchId, driverId)
                .orElseThrow(() -> new CustomException(ErrorCode.AUTH_FORBIDDEN));
        return getHistory(matchId, limit, since);
    }

    /**
     * 레거시 GPS 이력 조회 (화주 소유 match 한정).
     */
    @Transactional(readOnly = true)
    public List<GpsLog> getGpsHistoryForShipper(Long shipperId, Long matchId, LocalDateTime since, int limit) {
        matchRepository.findByMatchIdAndShipperId(matchId, shipperId)
                .orElseThrow(() -> new CustomException(ErrorCode.AUTH_FORBIDDEN));
        return getHistory(matchId, limit, since);
    }

    private List<GpsLog> getHistory(Long matchId, int limit, LocalDateTime since) {
        int boundedLimit = Math.max(1, Math.min(limit, 500));
        if (since != null) {
            return gpsLogRepository.findByMatchIdAndLoggedAtAfterOrderByLoggedAtDesc(matchId, since)
                    .stream()
                    .limit(boundedLimit)
                    .toList();
        }
        return gpsLogRepository.findByMatchIdOrderByLoggedAtDesc(matchId, PageRequest.of(0, boundedLimit));
    }

    private BigDecimal toDecimal(Double value, int scale) {
        return BigDecimal.valueOf(value).setScale(scale, RoundingMode.HALF_UP);
    }

    private BigDecimal toNullableDecimal(Double value, int scale) {
        if (value == null) {
            return null;
        }
        return BigDecimal.valueOf(value).setScale(scale, RoundingMode.HALF_UP);
    }
}
