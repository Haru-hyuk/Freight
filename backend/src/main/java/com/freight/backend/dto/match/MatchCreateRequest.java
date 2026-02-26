package com.freight.backend.dto.match;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import lombok.Getter;
import lombok.Setter;

/**
 * 매칭 생성 요청 DTO
 */
@Getter
@Setter
public class MatchCreateRequest {
    @NotNull(message = "quoteId는 필수입니다.")
    @Positive(message = "quoteId는 양수여야 합니다.")
    private Long quoteId;
}
