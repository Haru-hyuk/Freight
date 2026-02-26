package com.freight.backend.dto.match;

import com.freight.backend.entity.Match;
import java.time.LocalDateTime;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;

/**
 * 매칭 응답 DTO
 */
@Getter
@Builder
@AllArgsConstructor
public class MatchResponse {

    private Long matchId;
    private Long quoteId;
    private Long driverId;
    private Boolean accepted;
    private String status;
    private String matchGroupKey;
    private String matchGroupType;
    private Integer matchGroupOrder;
    private Boolean locationSharingEnabled;
    private LocalDateTime locationSharingUpdatedAt;
    private LocalDateTime acceptedAt;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    /**
     * 엔티티에서 DTO로 변환
     */
    public static MatchResponse from(Match match) {
        return MatchResponse.builder()
                .matchId(match.getMatchId())
                .quoteId(match.getQuoteId())
                .driverId(match.getDriverId())
                .accepted(match.getAccepted())
                .status(match.getStatus().name())
                .matchGroupKey(match.getMatchGroupKey())
                .matchGroupType(match.getMatchGroupType())
                .matchGroupOrder(match.getMatchGroupOrder())
                .locationSharingEnabled(match.getLocationSharingEnabled())
                .locationSharingUpdatedAt(match.getLocationSharingUpdatedAt())
                .acceptedAt(match.getAcceptedAt())
                .createdAt(match.getCreatedAt())
                .updatedAt(match.getUpdatedAt())
                .build();
    }
}
