package com.freight.backend.dto.quote;

import java.util.UUID;
import lombok.AllArgsConstructor;
import lombok.Getter;

@Getter
@AllArgsConstructor
public class QuoteCreateResponse {
    private Long quoteId;
    private UUID quotePublicId;
}
