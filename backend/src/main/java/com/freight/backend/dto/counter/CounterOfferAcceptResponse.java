package com.freight.backend.dto.counter;

import com.freight.backend.entity.CounterOffer;
import com.freight.backend.entity.Match;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CounterOfferAcceptResponse {

    private Long counterOfferId;
    private Long quoteId;
    private Long matchId;
    private Long driverId;
    private String counterOfferStatus;
    private String quoteStatus;
    private String matchStatus;
    private boolean paymentRequired;
    private String nextAction;

    public static CounterOfferAcceptResponse of(CounterOffer offer, Match match, String quoteStatus) {
        return CounterOfferAcceptResponse.builder()
                .counterOfferId(offer.getCounterOfferId())
                .quoteId(offer.getQuoteId())
                .matchId(match.getMatchId())
                .driverId(match.getDriverId())
                .counterOfferStatus(offer.getStatus().name())
                .quoteStatus(quoteStatus)
                .matchStatus(match.getStatus().name())
                .paymentRequired(true)
                .nextAction("PAYMENT_REQUIRED")
                .build();
    }
}
