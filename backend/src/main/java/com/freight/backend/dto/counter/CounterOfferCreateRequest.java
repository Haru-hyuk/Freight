package com.freight.backend.dto.counter;

import jakarta.validation.constraints.AssertTrue;
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

    @AssertTrue(message = "proposedPrice 또는 message 중 하나는 입력해야 합니다.")
    public boolean hasPriceOrMessage() {
        return proposedPrice != null || (message != null && !message.isBlank());
    }
}
