package com.freight.backend.dto.payment;

import com.freight.backend.entity.Payment;
import com.freight.backend.entity.Payment.PaymentMethod;
import com.freight.backend.entity.Payment.PaymentStatus;
import java.time.LocalDateTime;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PaymentResponse {

    private Long paymentId;
    private Long matchId;
    private String orderNo;
    private PaymentMethod method;
    private PaymentStatus status;
    private LocalDateTime paidAt;
    private String attemptId;
    private String amountType;
    private String pgRef;
    private Integer totalAmount;
    private LocalDateTime createdAt;

    public static PaymentResponse from(Payment p) {
        return PaymentResponse.builder()
                .paymentId(p.getPaymentId())
                .matchId(p.getMatchId())
                .orderNo(p.getOrderNo())
                .method(p.getMethod())
                .status(p.getStatus())
                .paidAt(p.getPaidAt())
                .attemptId(p.getAttemptId())
                .amountType(p.getAmountType())
                .pgRef(p.getPgRef())
                .totalAmount(p.getTotalAmount())
                .createdAt(p.getCreatedAt())
                .build();
    }
}
