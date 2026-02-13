package com.freight.backend.dto.payment;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PaymentPrepareRequest {

    @NotNull(message = "matchId is required")
    private Long matchId;

    @NotNull(message = "amount is required")
    @Min(value = 100, message = "amount must be at least 100 KRW")
    private Long amount;

    private String orderName;
}
