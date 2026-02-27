package com.freight.backend.gpsload.tracking.dto;

import java.time.LocalDateTime;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
@AllArgsConstructor
public class TrackingShareStateResponse {
    private Long matchId;
    private Boolean enabled;
    private LocalDateTime updatedAt;
}
