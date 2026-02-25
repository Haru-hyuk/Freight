package com.freight.backend.gpsload.gps.service;

import com.freight.backend.gpsload.gps.entity.GpsLog;
import com.freight.backend.gpsload.gps.model.GpsLogRequest;
import com.freight.backend.gpsload.gps.model.TrackingResponse;
import com.freight.backend.gpsload.gps.model.TrackingResponse.DriverLocation;
import com.freight.backend.gpsload.gps.model.TrackingResponse.RoutePoint;
import com.freight.backend.gpsload.gps.repository.GpsTrackingLogRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Service
public class GpsTrackingService {

    private final GpsTrackingLogRepository gpsLogRepository;

    public GpsTrackingService(GpsTrackingLogRepository gpsLogRepository) {
        this.gpsLogRepository = gpsLogRepository;
    }

    @Transactional
    public GpsLog receiveGpsLog(Long matchId, Long driverId, GpsLogRequest request) {
        GpsLog gpsLog = new GpsLog(
                matchId,
                driverId,
                request.lat(),
                request.lng(),
                request.speedKmh(),
                request.bearing(),
                LocalDateTime.now()
        );
        return gpsLogRepository.save(gpsLog);
    }

    @Transactional(readOnly = true)
    public TrackingResponse getTrackingInfo(Long matchId, List<RoutePoint> route, String matchStatus) {
        DriverLocation driverLocation = null;
        Optional<GpsLog> latestLog = gpsLogRepository.findTopByMatchIdOrderByLoggedAtDesc(matchId);
        if (latestLog.isPresent()) {
            GpsLog gl = latestLog.get();
            driverLocation = new DriverLocation(
                    gl.getLat(),
                    gl.getLng(),
                    gl.getSpeedKmh(),
                    gl.getBearing(),
                    Boolean.FALSE,
                    null,
                    gl.getLoggedAt()
            );
        }
        return new TrackingResponse(driverLocation, route, List.of(), matchStatus);
    }

    @Transactional(readOnly = true)
    public List<GpsLog> getGpsHistory(Long matchId, int limit, LocalDateTime since) {
        if (since != null) {
            return gpsLogRepository.findByMatchIdAndLoggedAtAfterOrderByLoggedAtDesc(matchId, since);
        }
        return gpsLogRepository.findRecentByMatchId(matchId, limit);
    }
}
