package com.freight.backend.dto.checklist;

import java.math.BigDecimal;
import lombok.AllArgsConstructor;
import lombok.Getter;

@Getter
@AllArgsConstructor
public class ChecklistItemResponse {
    private Long checklistItemId;
    private String category;
    private String name;
    private String icon;
    private Boolean hasExtraFee;
    private BigDecimal baseExtraFee;
    private Boolean requiresExtraInput;
    private String extraInputLabel;
    private Integer sortOrder;
}
