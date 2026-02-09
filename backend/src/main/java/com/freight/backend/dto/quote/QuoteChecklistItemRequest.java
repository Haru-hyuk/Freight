package com.freight.backend.dto.quote;

import java.math.BigDecimal;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class QuoteChecklistItemRequest {
    private Long checklistItemId;
    private String extraInput;
    private BigDecimal extraFee;
}
