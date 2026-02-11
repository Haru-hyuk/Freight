package com.freight.backend.dto.payment;

import com.freight.backend.entity.Payment.PaymentMethod;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PaymentCreateRequest {

    @NotNull(message = "matchId is required")
    private Long matchId;

    private PaymentMethod method;

    private String orderNo;

    private String amountType;

    private String pgRef;
}
