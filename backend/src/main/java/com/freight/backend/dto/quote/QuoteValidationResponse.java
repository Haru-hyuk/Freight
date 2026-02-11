package com.freight.backend.dto.quote;

import java.util.List;
import lombok.AllArgsConstructor;
import lombok.Getter;

@Getter
@AllArgsConstructor
public class QuoteValidationResponse {
    private int estimatedMinPrice;
    private int estimatedMaxPrice;
    private int estimatedWeightedPrice;
    private List<String> comments;
}
