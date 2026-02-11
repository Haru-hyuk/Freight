package com.freight.backend.service;

import com.freight.backend.dto.payment.PaymentConfirmRequest;
import com.freight.backend.dto.payment.PaymentCreateRequest;
import com.freight.backend.dto.payment.PaymentPrepareRequest;
import com.freight.backend.dto.payment.PaymentPrepareResponse;
import com.freight.backend.dto.payment.PaymentResponse;
import com.freight.backend.entity.Payment;
import com.freight.backend.entity.Payment.PaymentMethod;
import com.freight.backend.exception.CustomException;
import com.freight.backend.exception.ErrorCode;
import com.freight.backend.entity.Match;
import com.freight.backend.entity.Quote;
import com.freight.backend.repository.MatchRepository;
import com.freight.backend.repository.PaymentRepository;
import com.freight.backend.repository.QuoteRepository;
import com.freight.backend.tosspayments.TossPaymentConfirmResponse;
import com.freight.backend.tosspayments.TossPaymentsClient;
import jakarta.transaction.Transactional;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

/**
 * 결제 서비스
 * - 수동 결제 생성, 토스 결제 준비/승인, 조회, 테스트용 완료/실패
 */
@Service
@RequiredArgsConstructor
public class PaymentService {

    private final PaymentRepository paymentRepository;
    private final MatchRepository matchRepository;
    private final QuoteRepository quoteRepository;
    private final TossPaymentsClient tossPaymentsClient;

    @Value("${toss.payments.client-key:}")
    private String clientKey;

    /**
     * 해당 매칭의 견적을 만든 화주만 결제 가능.
     * matchId → Match → Quote → shipperId와 요청자 shipperId 일치 여부 검사.
     */
    private void ensureShipperOwnsMatch(Long matchId, Long shipperId) {
        Match match = matchRepository.findById(matchId)
                .orElseThrow(() -> new CustomException(ErrorCode.MATCH_NOT_FOUND));
        Quote quote = quoteRepository.findById(match.getQuoteId())
                .orElseThrow(() -> new CustomException(ErrorCode.INVALID_REQUEST));
        if (!quote.getShipperId().equals(shipperId)) {
            throw new CustomException(ErrorCode.AUTH_FORBIDDEN);
        }
    }

    /** 수동 결제 생성 (orderNo 미입력 시 자동 생성). 해당 매칭의 견적 소유 화주만 가능. */
    @Transactional
    public PaymentResponse create(PaymentCreateRequest req, Long shipperId) {
        ensureShipperOwnsMatch(req.getMatchId(), shipperId);
        PaymentMethod method = req.getMethod() != null ? req.getMethod() : PaymentMethod.CARD;
        String orderNo = req.getOrderNo() != null && !req.getOrderNo().isBlank()
                ? req.getOrderNo()
                : "ORD-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase();

        Payment payment = Payment.builder()
                .matchId(req.getMatchId())
                .orderNo(orderNo)
                .method(method)
                .status(Payment.PaymentStatus.PENDING)
                .amountType(req.getAmountType())
                .pgRef(req.getPgRef())
                .build();

        Payment saved = paymentRepository.save(payment);
        return PaymentResponse.from(saved);
    }

    /** 결제 단건 조회 */
    @Transactional
    public PaymentResponse getById(Long paymentId) {
        Payment payment = paymentRepository.findById(paymentId)
                .orElseThrow(() -> new CustomException(ErrorCode.INVALID_REQUEST));
        return PaymentResponse.from(payment);
    }

    /** 매칭 ID로 결제 목록 조회 */
    @Transactional
    public List<PaymentResponse> getByMatchId(Long matchId) {
        return paymentRepository.findByMatchId(matchId).stream()
                .map(PaymentResponse::from)
                .collect(Collectors.toList());
    }

    /** 화주가 결제한 결제 목록 조회 (본인 견적의 매칭에 대한 모든 결제, 최신순) */
    @Transactional
    public List<PaymentResponse> getShipperPayments(Long shipperId) {
        List<Long> quoteIds = quoteRepository.findByShipperId(shipperId).stream()
                .map(Quote::getQuoteId)
                .collect(Collectors.toList());
        if (quoteIds.isEmpty()) {
            return List.of();
        }
        List<Long> matchIds = matchRepository.findByQuoteIdIn(quoteIds).stream()
                .map(Match::getMatchId)
                .collect(Collectors.toList());
        if (matchIds.isEmpty()) {
            return List.of();
        }
        return paymentRepository.findByMatchIdInOrderByCreatedAtDesc(matchIds).stream()
                .map(PaymentResponse::from)
                .collect(Collectors.toList());
    }

    /**
     * 토스 결제 준비.
     * orderId 생성 후 DB에 PENDING 결제 저장, clientKey/orderId/amount/orderName 반환.
     * 프론트는 이 값으로 토스 결제창 호출 → 성공 시 paymentKey를 confirm으로 전달.
     * 해당 매칭의 견적 소유 화주만 호출 가능.
     */
    @Transactional
    public PaymentPrepareResponse prepareForToss(PaymentPrepareRequest req, Long shipperId) {
        ensureShipperOwnsMatch(req.getMatchId(), shipperId);
        if (!tossPaymentsClient.isConfigured()) {
            throw new CustomException(ErrorCode.INVALID_REQUEST);
        }
        String orderId = "FRT-" + UUID.randomUUID().toString().replace("-", "").substring(0, 16).toUpperCase();
        String orderName = req.getOrderName() != null && !req.getOrderName().isBlank()
                ? req.getOrderName()
                : "화물운송 결제";

        Payment payment = Payment.builder()
                .matchId(req.getMatchId())
                .orderNo(orderId)
                .method(PaymentMethod.CARD)
                .status(Payment.PaymentStatus.PENDING)
                .totalAmount(req.getAmount() != null ? req.getAmount().intValue() : null)
                .build();

        Payment saved = paymentRepository.save(payment);

        return PaymentPrepareResponse.builder()
                .paymentId(saved.getPaymentId())
                .orderId(orderId)
                .amount(req.getAmount())
                .orderName(orderName)
                .clientKey(clientKey != null ? clientKey : "")
                .build();
    }

    /**
     * 토스 결제 승인.
     * orderId로 DB 결제 조회 → 금액 일치 검증 → 토스 승인 API 호출 → 성공 시 COMPLETED, pgRef(paymentKey) 저장.
     * 해당 매칭의 견적 소유 화주만 호출 가능.
     */
    @Transactional
    public PaymentResponse confirmWithToss(PaymentConfirmRequest req, Long shipperId) {
        Payment payment = paymentRepository.findByOrderNo(req.getOrderId())
                .orElseThrow(() -> new CustomException(ErrorCode.INVALID_REQUEST));

        ensureShipperOwnsMatch(payment.getMatchId(), shipperId);

        if (payment.getStatus() != Payment.PaymentStatus.PENDING) {
            throw new CustomException(ErrorCode.INVALID_REQUEST);
        }

        // 준비 시 저장한 금액과 요청 금액 일치 여부 검증 (위변조 방지)
        Integer expectedAmount = payment.getTotalAmount();
        if (expectedAmount == null || req.getAmount() == null
                || expectedAmount.longValue() != req.getAmount()) {
            payment.fail();
            paymentRepository.flush();
            throw new CustomException(ErrorCode.INVALID_REQUEST);
        }

        // 토스페이먼츠 승인 API 호출
        TossPaymentConfirmResponse tossResponse;
        try {
            tossResponse = tossPaymentsClient.confirm(
                    req.getPaymentKey(),
                    req.getOrderId(),
                    req.getAmount()
            );
        } catch (Exception e) {
            payment.fail();
            paymentRepository.flush();
            throw new CustomException(ErrorCode.INVALID_REQUEST);
        }

        // 토스 응답이 성공이 아니면 실패 처리
        if (tossResponse == null || !tossResponse.isDone()) {
            payment.fail();
            paymentRepository.flush();
            throw new CustomException(ErrorCode.INVALID_REQUEST);
        }

        // 승인 성공: 결제 완료 처리, pgRef에 토스 paymentKey 저장
        LocalDateTime approvedAt = tossResponse.getApprovedAtAsLocalDateTime();
        payment.complete(approvedAt != null ? approvedAt : LocalDateTime.now(), tossResponse.getPaymentKey());
        paymentRepository.flush();

        return PaymentResponse.from(payment);
    }
}
