package com.freight.backend.dto.counter;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class CounterOfferCreateRequest {
    private Integer proposedPrice;
    private String message;
}
