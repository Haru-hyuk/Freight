package com.freight.backend.dto.match;

import lombok.Getter;
import lombok.Setter;

/**
 * 매칭 생성 요청 DTO
 */
@Getter
@Setter
public class MatchCreateRequest {
    private Long quoteId;
}
