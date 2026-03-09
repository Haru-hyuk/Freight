package com.freight.backend.dto.admin;

import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
public class AdminReviewRequest {
    private String action;
    private String reason;
}

