package com.freight.backend.dto.match;

import java.util.List;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
@AllArgsConstructor
public class BatchStartTransitResponse {

    private String matchGroupKey;
    private Integer startedCount;
    private List<MatchResponse> matches;
}
