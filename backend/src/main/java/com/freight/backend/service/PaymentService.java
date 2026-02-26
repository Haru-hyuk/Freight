package com.freight.backend.service;

import com.freight.backend.dto.payment.PaymentConfirmRequest;
import com.freight.backend.dto.payment.PaymentPrepareRequest;
import com.freight.backend.dto.payment.PaymentPrepareResponse;
import com.freight.backend.dto.payment.PaymentResponse;
import com.freight.backend.entity.Match;
import com.freight.backend.entity.Payment;
import com.freight.backend.entity.Payment.PaymentMethod;
import com.freight.backend.entity.Quote;
import com.freight.backend.entity.Settlement;
import com.freight.backend.exception.CustomException;
import com.freight.backend.exception.ErrorCode;
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
 * - 토스페이먼츠 결제 준비/승인
 * - 결제 내역 조회
 * - 정산 연동
 */
@Service
@RequiredArgsConstructor
public class PaymentService {

    private final PaymentRepository paymentRepository;
    private final MatchRepository matchRepository;
    private final QuoteRepository quoteRepository;
    private final TossPaymentsClient tossPaymentsClient;
    private final SettlementService settlementService;

    @Value("${toss.payments.client-key:}")
    private String clientKey;

    @Value("${toss.payments.test-mode:false}")
    private boolean tossTestMode;

    /** 화주 본인 매칭인지 검증 */
    private MatchQuote ensureShipperOwnsMatch(Long matchId, Long shipperId) {
        Match match = matchRepository.findById(matchId)
                .orElseThrow(() -> new CustomException(ErrorCode.MATCH_NOT_FOUND));
        Quote quote = quoteRepository.findById(match.getQuoteId())
                .orElseThrow(() -> new CustomException(ErrorCode.INVALID_REQUEST));
        if (!quote.getShipperId().equals(shipperId)) {
            throw new CustomException(ErrorCode.AUTH_FORBIDDEN);
        }
        return new MatchQuote(match, quote);
    }

    @Transactional
    public PaymentResponse getById(Long paymentId, Long shipperId) {
        Payment payment = paymentRepository.findById(paymentId)
                .orElseThrow(() -> new CustomException(ErrorCode.INVALID_REQUEST));
        ensureShipperOwnsMatch(payment.getMatchId(), shipperId);
        return PaymentResponse.from(payment);
    }

    @Transactional
    public List<PaymentResponse> getByMatchId(Long matchId, Long shipperId) {
        ensureShipperOwnsMatch(matchId, shipperId);
        return paymentRepository.findByMatchId(matchId).stream()
                .map(PaymentResponse::from)
                .collect(Collectors.toList());
    }

    /** 화주의 전체 결제 내역 조회 */
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

    /** 토스페이먼츠 결제 준비 (orderId 생성) */
    @Transactional
    public PaymentPrepareResponse prepareForToss(PaymentPrepareRequest req, Long shipperId) {
        MatchQuote matchQuote = ensureShipperOwnsMatch(req.getMatchId(), shipperId);
        if (!tossPaymentsClient.isConfigured() && !tossTestMode) {
            throw new CustomException(ErrorCode.INVALID_REQUEST);
        }

        Match match = matchQuote.match();
        Quote quote = matchQuote.quote();
        // 매칭 상태 검증: 수락됨 + 진행중이어야 결제 가능
        if (!Boolean.TRUE.equals(match.getAccepted())
                || match.getStatus() == Match.Status.CANCELLED
                || match.getStatus() == Match.Status.COMPLETED) {
            throw new CustomException(ErrorCode.INVALID_REQUEST);
        }
        // 이미 결제 완료된 매칭은 중복 결제 불가
        if (paymentRepository.existsByMatchIdAndStatus(req.getMatchId(), Payment.PaymentStatus.COMPLETED)) {
            throw new CustomException(ErrorCode.INVALID_REQUEST);
        }
        // 결제 금액과 견적 금액 일치 검증
        if (quote.getFinalPrice() == null || req.getAmount() == null
                || quote.getFinalPrice().longValue() != req.getAmount()) {
            throw new CustomException(ErrorCode.INVALID_REQUEST);
        }

        // 주문번호 생성: FRT-{UUID 16자리}
        String orderId = "FRT-" + UUID.randomUUID().toString().replace("-", "").substring(0, 16).toUpperCase();
        String orderName = req.getOrderName() != null && !req.getOrderName().isBlank()
                ? req.getOrderName()
                : "Freight payment";

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

    /** 토스페이먼츠 결제 승인 및 정산 생성 */
    @Transactional
    public PaymentResponse confirmWithToss(PaymentConfirmRequest req, Long shipperId) {
        Payment payment = paymentRepository.findByOrderNo(req.getOrderId())
                .orElseThrow(() -> new CustomException(ErrorCode.INVALID_REQUEST));

        MatchQuote matchQuote = ensureShipperOwnsMatch(payment.getMatchId(), shipperId);
        if (matchQuote.match().getStatus() == Match.Status.CANCELLED) {
            throw new CustomException(ErrorCode.INVALID_REQUEST);
        }

        if (payment.getStatus() != Payment.PaymentStatus.PENDING) {
            throw new CustomException(ErrorCode.INVALID_REQUEST);
        }
        if (paymentRepository.existsByMatchIdAndStatus(payment.getMatchId(), Payment.PaymentStatus.COMPLETED)) {
            throw new CustomException(ErrorCode.INVALID_REQUEST);
        }

        // 결제 금액 위변조 검증 (준비 시 금액 vs 승인 요청 금액)
        Integer expectedAmount = payment.getTotalAmount();
        if (expectedAmount == null || req.getAmount() == null
                || expectedAmount.longValue() != req.getAmount()) {
            payment.fail();
            paymentRepository.flush();
            throw new CustomException(ErrorCode.INVALID_REQUEST);
        }

        // 테스트 모드: test_ 접두사 paymentKey는 토스 API 호출 없이 승인
        boolean useLocalTestConfirm = tossTestMode
                && req.getPaymentKey() != null
                && req.getPaymentKey().startsWith("test_");

        if (useLocalTestConfirm) {
            payment.complete(LocalDateTime.now(), req.getPaymentKey());
        } else {
            if (!tossPaymentsClient.isConfigured()) {
                throw new CustomException(ErrorCode.INVALID_REQUEST);
            }

            // 토스페이먼츠 결제 승인 API 호출
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

            if (tossResponse == null || !tossResponse.isDone()) {
                payment.fail();
                paymentRepository.flush();
                throw new CustomException(ErrorCode.INVALID_REQUEST);
            }

            LocalDateTime approvedAt = tossResponse.getApprovedAtAsLocalDateTime();
            payment.complete(approvedAt != null ? approvedAt : LocalDateTime.now(), tossResponse.getPaymentKey());
        }

        paymentRepository.flush();
        createSettlementAfterPayment(payment, matchQuote.match(), matchQuote.quote());

        return PaymentResponse.from(payment);
    }

    /** 결제 완료 후 정산 레코드 생성 */
    private void createSettlementAfterPayment(Payment payment, Match match, Quote quote) {
        if (payment == null || match == null || quote == null) {
            throw new CustomException(ErrorCode.INVALID_REQUEST);
        }
        if (match.getDriverId() == null) {
            throw new CustomException(ErrorCode.INVALID_REQUEST);
        }

        settlementService.createAfterPaymentConfirm(
                payment.getOrderNo(),
                payment.getTotalAmount() == null ? 0L : payment.getTotalAmount().longValue(),
                match.getMatchId(),
                match.getDriverId(),
                quote.getShipperId(),
                Settlement.SettlementType.NORMAL,
                resolveSettlementPaymentMethod(payment.getMethod())
        );
    }

    private Settlement.ShipperPaymentMethod resolveSettlementPaymentMethod(PaymentMethod paymentMethod) {
        if (paymentMethod == null) {
            return Settlement.ShipperPaymentMethod.CARD;
        }
        return switch (paymentMethod) {
            case TRANSFER -> Settlement.ShipperPaymentMethod.TRANSFER;
            case PREPAID -> Settlement.ShipperPaymentMethod.PREPAID;
            case CARD -> Settlement.ShipperPaymentMethod.CARD;
        };
    }

    private record MatchQuote(Match match, Quote quote) {
    }
}
