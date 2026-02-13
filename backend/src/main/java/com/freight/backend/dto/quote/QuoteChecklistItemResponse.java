package com.freight.backend.dto.quote;

import java.math.BigDecimal;
import lombok.AllArgsConstructor;
import lombok.Getter;

@Getter
@AllArgsConstructor
public class QuoteChecklistItemResponse {
    private Long checklistItemId;
    private String extraInput;
    private BigDecimal extraFee;
}
