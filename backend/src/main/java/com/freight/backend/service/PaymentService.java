package com.freight.backend.service;

import com.freight.backend.dto.payment.PaymentConfirmRequest;
import com.freight.backend.dto.payment.PaymentPrepareRequest;
import com.freight.backend.dto.payment.PaymentPrepareResponse;
import com.freight.backend.dto.payment.PaymentResponse;
import com.freight.backend.entity.FcmToken;
import com.freight.backend.entity.Match;
import com.freight.backend.entity.Notification;
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
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * 결제 서비스
 * - 토스페이먼츠 결제 준비/승인
 * - 결제 내역 조회
 * - 정산 연동
 */
@Service
@RequiredArgsConstructor
public class PaymentService {
    private static final Logger log = LoggerFactory.getLogger(PaymentService.class);

    private final PaymentRepository paymentRepository;
    private final MatchRepository matchRepository;
    private final QuoteRepository quoteRepository;
    private final TossPaymentsClient tossPaymentsClient;
    private final SettlementService settlementService;
    private final PaymentFailureService paymentFailureService;
    private final NotificationService notificationService;

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

        // 동일 매칭의 PENDING 결제가 있으면 재사용하여 중복 orderId 생성을 막는다.
        Payment pending = paymentRepository.findFirstByMatchIdAndStatusOrderByCreatedAtDesc(
                req.getMatchId(),
                Payment.PaymentStatus.PENDING
        ).orElse(null);
        if (pending != null) {
            return PaymentPrepareResponse.builder()
                    .paymentId(pending.getPaymentId())
                    .orderId(pending.getOrderNo())
                    .amount(pending.getTotalAmount() == null ? req.getAmount() : pending.getTotalAmount().longValue())
                    .orderName(req.getOrderName() != null && !req.getOrderName().isBlank() ? req.getOrderName() : "Freight payment")
                    .clientKey(clientKey != null ? clientKey : "")
                    .build();
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
    @Transactional(rollbackFor = Exception.class)
    public PaymentResponse confirmWithToss(PaymentConfirmRequest req, Long shipperId) {
        // [멱등성] paymentKey 기준 이미 완료된 결제가 있는지 확인
        if (req.getPaymentKey() != null && !req.getPaymentKey().isBlank()) {
            Payment existingByKey = paymentRepository.findByPgRef(req.getPaymentKey()).orElse(null);
            if (existingByKey != null && existingByKey.getStatus() == Payment.PaymentStatus.COMPLETED) {
                log.info("Payment already completed with paymentKey={}, returning existing", req.getPaymentKey());
                ensureShipperOwnsMatch(existingByKey.getMatchId(), shipperId);
                return PaymentResponse.from(existingByKey);
            }
        }

        Payment payment = paymentRepository.findByOrderNoForUpdate(req.getOrderId())
                .orElseThrow(() -> new CustomException(ErrorCode.INVALID_REQUEST));

        MatchQuote ownedMatchQuote = ensureShipperOwnsMatch(payment.getMatchId(), shipperId);
        Match lockedMatch = matchRepository.findByIdForUpdate(payment.getMatchId())
                .orElseThrow(() -> new CustomException(ErrorCode.MATCH_NOT_FOUND));
        MatchQuote matchQuote = new MatchQuote(lockedMatch, ownedMatchQuote.quote());

        // 같은 paymentKey를 다른 결제행이 선점한 경우를 트랜잭션 내에서 재확인한다.
        if (req.getPaymentKey() != null && !req.getPaymentKey().isBlank()) {
            Payment existingByKeyLocked = paymentRepository.findByPgRefForUpdate(req.getPaymentKey()).orElse(null);
            if (existingByKeyLocked != null && !existingByKeyLocked.getPaymentId().equals(payment.getPaymentId())) {
                if (existingByKeyLocked.getStatus() == Payment.PaymentStatus.COMPLETED) {
                    ensureShipperOwnsMatch(existingByKeyLocked.getMatchId(), shipperId);
                    createSettlementAfterPayment(existingByKeyLocked, matchQuote.match(), matchQuote.quote());
                    return PaymentResponse.from(existingByKeyLocked);
                }
                throw new CustomException(ErrorCode.INVALID_REQUEST);
            }
        }

        if (matchQuote.match().getStatus() == Match.Status.CANCELLED) {
            throw new CustomException(ErrorCode.INVALID_REQUEST);
        }

        if (payment.getStatus() == Payment.PaymentStatus.COMPLETED) {
            createSettlementAfterPayment(payment, matchQuote.match(), matchQuote.quote());
            return PaymentResponse.from(payment);
        }

        Payment completedOnSameMatch = paymentRepository.findFirstByMatchIdAndStatusOrderByCreatedAtDesc(
                payment.getMatchId(),
                Payment.PaymentStatus.COMPLETED
        ).orElse(null);
        if (completedOnSameMatch != null) {
            createSettlementAfterPayment(completedOnSameMatch, matchQuote.match(), matchQuote.quote());
            return PaymentResponse.from(completedOnSameMatch);
        }

        if (payment.getStatus() != Payment.PaymentStatus.PENDING) {
            throw new CustomException(ErrorCode.INVALID_REQUEST);
        }

        // 결제 금액 위변조 검증 (준비 시 금액 vs 승인 요청 금액)
        Integer expectedAmount = payment.getTotalAmount();
        if (expectedAmount == null || req.getAmount() == null
                || expectedAmount.longValue() != req.getAmount()) {
            markPaymentFailedQuietly(payment.getPaymentId(), req.getOrderId());
            log.warn("Payment confirm rejected by amount mismatch (orderId={}, expected={}, requested={})",
                    req.getOrderId(), expectedAmount, req.getAmount());
            throw new CustomException(ErrorCode.INVALID_REQUEST);
        }

        // 테스트 모드: test_ 접두사 paymentKey는 토스 API 호출 없이 승인
        boolean useLocalTestConfirm = tossTestMode
                && req.getPaymentKey() != null
                && req.getPaymentKey().startsWith("test_");

        LocalDateTime approvedAt;
        String confirmedPaymentKey;
        if (useLocalTestConfirm) {
            approvedAt = LocalDateTime.now();
            confirmedPaymentKey = req.getPaymentKey();
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
                markPaymentFailedQuietly(payment.getPaymentId(), req.getOrderId());
                log.warn("Toss confirm API call failed (orderId={}): {}", req.getOrderId(), e.getMessage(), e);
                throw new CustomException(ErrorCode.INVALID_REQUEST);
            }

            if (tossResponse == null || !tossResponse.isDone()) {
                markPaymentFailedQuietly(payment.getPaymentId(), req.getOrderId());
                log.warn("Toss confirm returned non-done state (orderId={})", req.getOrderId());
                throw new CustomException(ErrorCode.INVALID_REQUEST);
            }

            approvedAt = tossResponse.getApprovedAtAsLocalDateTime();
            confirmedPaymentKey = tossResponse.getPaymentKey();
        }

        // FOR UPDATE로 잠근 동일 엔티티를 현재 트랜잭션에서 바로 완료 처리한다.
        payment.complete(
                approvedAt != null ? approvedAt : LocalDateTime.now(),
                confirmedPaymentKey
        );
        Payment completedPayment;
        try {
            completedPayment = paymentRepository.save(payment);
        } catch (DataIntegrityViolationException e) {
            // UNIQUE 제약(특히 pg_ref/order_no) 경합 시 이미 확정된 결제 레코드를 반환한다.
            if (confirmedPaymentKey != null && !confirmedPaymentKey.isBlank()) {
                Payment existingByKey = paymentRepository.findByPgRef(confirmedPaymentKey).orElse(null);
                if (existingByKey != null && existingByKey.getStatus() == Payment.PaymentStatus.COMPLETED) {
                    ensureShipperOwnsMatch(existingByKey.getMatchId(), shipperId);
                    createSettlementAfterPayment(existingByKey, matchQuote.match(), matchQuote.quote());
                    return PaymentResponse.from(existingByKey);
                }
            }
            throw new CustomException(ErrorCode.INVALID_REQUEST);
        }

        // 정산은 idempotent하게 생성/복구한다. 실패 시에도 결제 완료 상태는 유지된다.
        createSettlementAfterPayment(completedPayment, matchQuote.match(), matchQuote.quote());
        notifyPaymentCompleted(matchQuote.match(), matchQuote.quote());

        return PaymentResponse.from(completedPayment);
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

    private void notifyPaymentCompleted(Match match, Quote quote) {
        if (match == null || quote == null) {
            return;
        }

        if (quote.getShipperId() != null) {
            notificationService.createNotification(
                    FcmToken.UserType.SHIPPER,
                    quote.getShipperId(),
                    match.getMatchId(),
                    Notification.Type.PAYMENT_COMPLETED,
                    "결제가 완료되었습니다. 기사 운행 시작을 기다려주세요."
            );
        }

        if (match.getDriverId() != null) {
            notificationService.createNotification(
                    FcmToken.UserType.DRIVER,
                    match.getDriverId(),
                    match.getMatchId(),
                    Notification.Type.PAYMENT_COMPLETED,
                    "화주 결제가 완료되었습니다. 운행을 시작할 수 있습니다."
            );
        }
    }

    private void markPaymentFailedQuietly(Long paymentId, String orderId) {
        try {
            paymentFailureService.markFailed(paymentId);
        } catch (Exception ex) {
            // 결제 실패 상태 기록은 보조 단계다. 이 단계 오류가 500으로 전파되지 않도록 차단한다.
            log.error("Failed to mark payment as FAILED (orderId={}, paymentId={}): {}", orderId, paymentId, ex.getMessage(), ex);
        }
    }

    private record MatchQuote(Match match, Quote quote) {
    }
}
