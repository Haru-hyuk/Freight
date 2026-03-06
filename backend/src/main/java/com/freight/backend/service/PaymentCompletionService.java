package com.freight.backend.service;

import com.freight.backend.entity.Payment;
import com.freight.backend.exception.CustomException;
import com.freight.backend.exception.ErrorCode;
import com.freight.backend.repository.PaymentRepository;
import java.time.LocalDateTime;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

/**
 * 결제 완료 상태를 별도 트랜잭션으로 확정한다.
 * 외부 PG 승인 후 정산 단계에서 실패하더라도 결제 완료 상태를 안전하게 보존한다.
 */
@Service
@RequiredArgsConstructor
public class PaymentCompletionService {

    private final PaymentRepository paymentRepository;

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public Payment markCompleted(Long paymentId, LocalDateTime paidAt, String paymentKey) {
        Payment payment = paymentRepository.findById(paymentId)
                .orElseThrow(() -> new CustomException(ErrorCode.INVALID_REQUEST));

        if (payment.getStatus() == Payment.PaymentStatus.COMPLETED) {
            return payment;
        }

        payment.complete(paidAt != null ? paidAt : LocalDateTime.now(), paymentKey);
        return paymentRepository.save(payment);
    }
}
