package com.freight.backend.dto.counter;

import com.freight.backend.entity.CounterOffer;
import java.time.LocalDateTime;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class CounterOfferResponse {
    private Long counterOfferId;
    private Long quoteId;
    private Long driverId;
    private Integer proposedPrice;
    private String message;
    private String status;
    private LocalDateTime createdAt;
    private LocalDateTime respondedAt;

    public static CounterOfferResponse from(CounterOffer offer) {
        return CounterOfferResponse.builder()
                .counterOfferId(offer.getCounterOfferId())
                .quoteId(offer.getQuoteId())
                .driverId(offer.getDriverId())
                .proposedPrice(offer.getProposedPrice())
                .message(offer.getMessage())
                .status(offer.getStatus().name())
                .createdAt(offer.getCreatedAt())
                .respondedAt(offer.getRespondedAt())
                .build();
    }
}
