package com.freight.backend.dto.admin;

import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
public class AdminSanctionCreateRequest {
    private String targetId;
    private String type;
    private String reason;
    private Integer amount;
}
