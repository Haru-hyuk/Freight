package com.freight.backend.dto.payment;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PaymentConfirmRequest {

    @NotBlank(message = "paymentKey is required")
    private String paymentKey;

    @NotBlank(message = "orderId is required")
    private String orderId;

    @NotNull(message = "amount is required")
    @Min(value = 100, message = "amount must be at least 100 KRW")
    private Long amount;
}
