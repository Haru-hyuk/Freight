package com.freight.backend.service;

import com.freight.backend.repository.PaymentRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

/**
 * 결제 승인 실패 상태를 별도 트랜잭션으로 기록한다.
 * confirm 트랜잭션이 롤백되어도 FAILED 상태가 유지되도록 분리한다.
 */
@Service
@RequiredArgsConstructor
public class PaymentFailureService {

    private final PaymentRepository paymentRepository;

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void markFailed(Long paymentId) {
        if (paymentId == null || paymentId <= 0) {
            return;
        }
        paymentRepository.findById(paymentId).ifPresent(payment -> {
            payment.fail();
            paymentRepository.save(payment);
        });
    }
}
