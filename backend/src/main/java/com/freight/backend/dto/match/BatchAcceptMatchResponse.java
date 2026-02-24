package com.freight.backend.dto.match;

import java.util.List;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
@AllArgsConstructor
public class BatchAcceptMatchResponse {

    private String matchGroupKey;
    private String matchGroupType;
    private Integer acceptedCount;
    private List<MatchResponse> matches;
}
