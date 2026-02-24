package com.freight.backend.dto.tracking;

import java.time.LocalDateTime;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
@AllArgsConstructor
public class GpsLogUpsertResponse {
    private Long gpsLogId;
    private Long matchId;
    private LocalDateTime loggedAt;
    private Boolean deduplicated;
    private String reason;
}
