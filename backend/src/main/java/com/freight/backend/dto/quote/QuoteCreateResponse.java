package com.freight.backend.dto.quote;

import java.util.UUID;
import java.util.List;
import lombok.AllArgsConstructor;
import lombok.Getter;

@Getter
@AllArgsConstructor
public class QuoteCreateResponse {
    private Long quoteId;
    private UUID quotePublicId;
    private Double originLat;
    private Double originLng;
    private Double destinationLat;
    private Double destinationLng;
    private List<QuoteStopResponse> stops;
}
