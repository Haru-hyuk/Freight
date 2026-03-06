package com.freight.backend.dto.counter;

import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class CounterOfferCreateRequest {
    @Positive(message = "proposedPrice는 양수여야 합니다.")
    private Integer proposedPrice;

    @Size(max = 500, message = "message는 500자 이하여야 합니다.")
    private String message;
}
