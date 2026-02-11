package com.freight.backend.dto.payment;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PaymentPrepareResponse {

    private Long paymentId;
    private String orderId;
    private Long amount;
    private String orderName;
    private String clientKey;
}
