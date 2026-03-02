package com.freight.backend.service;

import com.freight.backend.dto.match.BatchAcceptMatchRequest;
import com.freight.backend.dto.match.BatchAcceptMatchResponse;
import com.freight.backend.dto.match.MatchResponse;
import com.freight.backend.entity.FcmToken;
import com.freight.backend.entity.Match;
import com.freight.backend.entity.Notification;
import com.freight.backend.entity.Payment;
import com.freight.backend.entity.Quote;
import com.freight.backend.exception.CustomException;
import com.freight.backend.exception.ErrorCode;
import com.freight.backend.repository.MatchRepository;
import com.freight.backend.repository.PaymentRepository;
import com.freight.backend.repository.QuoteRepository;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class MatchService {

    private final MatchRepository matchRepository;
    private final QuoteRepository quoteRepository;
    private final PaymentRepository paymentRepository;
    private final NotificationService notificationService;

    /**
     * 화주가 자신의 OPEN 견적에 대해 매칭 레코드를 생성한다.
     * - 동일 견적에 활성 매칭이 있으면 생성 불가
     * - 초기 상태는 READY, accepted=false
     */
    @Transactional
    public MatchResponse createMatch(Long shipperId, Long quoteId) {
        Quote quote = quoteRepository.findById(quoteId)
                .orElseThrow(() -> new CustomException(ErrorCode.INVALID_REQUEST));

        if (!quote.getShipperId().equals(shipperId)) {
            throw new CustomException(ErrorCode.AUTH_FORBIDDEN);
        }
        if (!quote.isOpen()) {
            throw new CustomException(ErrorCode.QUOTE_NOT_OPEN);
        }
        Match existing = matchRepository.findByQuoteId(quoteId).orElse(null);
        if (existing != null && existing.getStatus() != Match.Status.CANCELLED) {
            // 배차요청 재시도는 멱등하게 허용해 오더마켓 노출 누락을 줄인다.
            if (existing.getStatus() == Match.Status.READY && !Boolean.TRUE.equals(existing.getAccepted())) {
                return MatchResponse.from(existing);
            }
            throw new CustomException(ErrorCode.MATCH_ALREADY_EXISTS);
        }

        Match match = Match.builder()
                .quoteId(quoteId)
                .driverId(null)
                .accepted(false)
                .status(Match.Status.READY)
                .build();

        Match saved = matchRepository.save(match);
        notificationService.createNotification(
                FcmToken.UserType.SHIPPER,
                shipperId,
                saved.getMatchId(),
                Notification.Type.MATCH_CREATED,
                "견적에 대한 매칭이 생성되었습니다."
        );
        return MatchResponse.from(saved);
    }

    /** 기사에게 노출되는 오픈 매칭 목록 조회 */
    @Transactional(readOnly = true)
    public List<MatchResponse> getOpenMatches() {
        return matchRepository.findByAcceptedFalseAndStatus(Match.Status.READY)
                .stream()
                .map(MatchResponse::from)
                .collect(Collectors.toList());
    }

    /**
     * 단건 매칭 수락.
     * - READY 상태에서만 수락 가능
     * - acceptIfAvailable로 동시성 충돌 방지
     * - 수락 후 견적 상태를 MATCHED로 전이
     */
    @Transactional
    public MatchResponse acceptMatch(Long driverId, Long matchId) {
        Match current = matchRepository.findById(matchId)
                .orElseThrow(() -> new CustomException(ErrorCode.MATCH_NOT_FOUND));

        if (current.getStatus() != Match.Status.READY) {
            throw new CustomException(ErrorCode.INVALID_REQUEST);
        }

        int updated = matchRepository.acceptIfAvailable(matchId, driverId, LocalDateTime.now());
        if (updated == 0) {
            throw new CustomException(ErrorCode.MATCH_ALREADY_ACCEPTED);
        }

        Match saved = matchRepository.findById(matchId)
                .orElseThrow(() -> new CustomException(ErrorCode.MATCH_NOT_FOUND));

        saved.assignGroup(null, "SINGLE", 1);
        matchRepository.save(saved);

        Quote quote = markQuoteMatched(saved.getQuoteId());

        notifyMatchAccepted(quote, saved.getMatchId());
        return MatchResponse.from(saved);
    }

    /**
     * 다건 매칭 일괄 수락.
     * - matchIds 정규화/검증
     * - 각 매칭 원자적 수락 처리
     * - 그룹 키/타입/순서를 부여해 합짐 묶음으로 관리
     */
    @Transactional
    public BatchAcceptMatchResponse acceptMatches(Long driverId, BatchAcceptMatchRequest request) {
        List<Long> requestedMatchIds = toDistinctPositiveIds(request == null ? null : request.getMatchIds());
        if (requestedMatchIds.isEmpty()) {
            throw new CustomException(ErrorCode.INVALID_REQUEST);
        }

        List<Match> found = matchRepository.findAllById(requestedMatchIds);
        if (found.size() != requestedMatchIds.size()) {
            throw new CustomException(ErrorCode.MATCH_NOT_FOUND);
        }

        Map<Long, Match> matchById = found.stream()
                .collect(Collectors.toMap(Match::getMatchId, m -> m));
        LocalDateTime acceptedAt = LocalDateTime.now();

        for (Long matchId : requestedMatchIds) {
            Match current = matchById.get(matchId);
            if (current == null) {
                throw new CustomException(ErrorCode.MATCH_NOT_FOUND);
            }
            if (current.getStatus() != Match.Status.READY) {
                throw new CustomException(ErrorCode.INVALID_REQUEST);
            }
            int updated = matchRepository.acceptIfAvailable(matchId, driverId, acceptedAt);
            if (updated == 0) {
                throw new CustomException(ErrorCode.MATCH_ALREADY_ACCEPTED);
            }
        }

        List<Match> acceptedMatches = matchRepository.findAllById(requestedMatchIds);
        Map<Long, Integer> requestedOrderByMatchId = new LinkedHashMap<>();
        for (int i = 0; i < requestedMatchIds.size(); i++) {
            requestedOrderByMatchId.put(requestedMatchIds.get(i), i + 1);
        }
        acceptedMatches.sort(Comparator.comparingInt(match ->
                requestedOrderByMatchId.getOrDefault(match.getMatchId(), Integer.MAX_VALUE)));
        Map<Long, Integer> quoteOrderMap = toQuoteOrderMap(request == null ? null : request.getOrderedQuoteIds());
        boolean grouped = acceptedMatches.size() > 1;
        String groupType = normalizeGroupType(request == null ? null : request.getRouteType(), grouped);
        String groupKey = grouped ? createMatchGroupKey(driverId) : null;

        for (int idx = 0; idx < acceptedMatches.size(); idx++) {
            Match acceptedMatch = acceptedMatches.get(idx);
            int groupOrder = quoteOrderMap.getOrDefault(acceptedMatch.getQuoteId(), idx + 1);
            acceptedMatch.assignGroup(groupKey, groupType, grouped ? groupOrder : 1);
            matchRepository.save(acceptedMatch);

            Quote quote = markQuoteMatched(acceptedMatch.getQuoteId());
            notifyMatchAccepted(quote, acceptedMatch.getMatchId());
        }

        List<MatchResponse> responses = acceptedMatches.stream()
                .sorted(Comparator.comparing(Match::getMatchGroupOrder, Comparator.nullsLast(Comparator.naturalOrder())))
                .map(MatchResponse::from)
                .collect(Collectors.toList());

        return BatchAcceptMatchResponse.builder()
                .matchGroupKey(groupKey)
                .matchGroupType(groupType)
                .acceptedCount(responses.size())
                .matches(responses)
                .build();
    }

    private Quote markQuoteMatched(Long quoteId) {
        Quote quote = quoteRepository.findById(quoteId)
                .orElseThrow(() -> new CustomException(ErrorCode.INVALID_REQUEST));
        quote.markMatched();
        return quoteRepository.save(quote);
    }

    private void notifyMatchAccepted(Quote quote, Long matchId) {
        notificationService.createNotification(
                FcmToken.UserType.SHIPPER,
                quote.getShipperId(),
                matchId,
                Notification.Type.MATCH_ACCEPTED,
                "A driver accepted your match."
        );
    }

    private List<Long> toDistinctPositiveIds(List<Long> values) {
        // null/중복/0이하 값 제거
        if (values == null || values.isEmpty()) {
            return List.of();
        }
        Set<Long> seen = new LinkedHashSet<>();
        for (Long value : values) {
            if (value != null && value > 0) {
                seen.add(value);
            }
        }
        return new ArrayList<>(seen);
    }

    private Map<Long, Integer> toQuoteOrderMap(List<Long> orderedQuoteIds) {
        // 요청한 quote 순서를 1-based 순서 맵으로 변환
        Map<Long, Integer> orderMap = new LinkedHashMap<>();
        if (orderedQuoteIds == null) {
            return orderMap;
        }
        int order = 1;
        for (Long quoteId : orderedQuoteIds) {
            if (quoteId == null || quoteId <= 0 || orderMap.containsKey(quoteId)) {
                continue;
            }
            orderMap.put(quoteId, order++);
        }
        return orderMap;
    }

    private String normalizeGroupType(String routeType, boolean grouped) {
        // 허용 타입 외 값은 다건 여부 기반 기본값으로 보정
        String normalized = routeType == null ? "" : routeType.trim().toUpperCase();
        if ("SINGLE".equals(normalized) || "BUNDLED".equals(normalized) || "HOME_ROUTE".equals(normalized)) {
            return normalized;
        }
        return grouped ? "BUNDLED" : "SINGLE";
    }

    private String createMatchGroupKey(Long driverId) {
        // 예: DRV-12-ABCDEF123456
        String suffix = UUID.randomUUID().toString().replace("-", "").substring(0, 12).toUpperCase();
        return "DRV-" + driverId + "-" + suffix;
    }

    @Transactional
    public void cancelMatch(Long userId, String role, Long matchId) {
        Match match = matchRepository.findById(matchId)
                .orElseThrow(() -> new CustomException(ErrorCode.MATCH_NOT_FOUND));

        Quote quote = quoteRepository.findById(match.getQuoteId())
                .orElseThrow(() -> new CustomException(ErrorCode.INVALID_REQUEST));

        boolean isShipperOwner = "ROLE_SHIPPER".equals(role) && quote.getShipperId().equals(userId);
        boolean isMatchedDriver = "ROLE_DRIVER".equals(role) && match.getDriverId() != null && match.getDriverId().equals(userId);

        if (!isShipperOwner && !isMatchedDriver) {
            throw new CustomException(ErrorCode.AUTH_FORBIDDEN);
        }

        match.cancel();
        quote.reopen();

        matchRepository.save(match);
        quoteRepository.save(quote);

        Long driverId = match.getDriverId();
        if ("ROLE_SHIPPER".equals(role) && driverId != null) {
            notificationService.createNotification(
                    FcmToken.UserType.DRIVER,
                    driverId,
                    match.getMatchId(),
                    Notification.Type.MATCH_CANCELLED,
                    "화주가 매칭을 취소했습니다."
            );
        }
        if ("ROLE_DRIVER".equals(role)) {
            notificationService.createNotification(
                    FcmToken.UserType.SHIPPER,
                    quote.getShipperId(),
                    match.getMatchId(),
                    Notification.Type.MATCH_CANCELLED,
                    "기사가 매칭을 취소했습니다."
            );
        }
    }

    @Transactional(readOnly = true)
    public MatchResponse getMatch(Long matchId, Long userId, String role) {
        if (userId == null) {
            throw new CustomException(ErrorCode.AUTH_FORBIDDEN);
        }
        Match match = matchRepository.findById(matchId)
                .orElseThrow(() -> new CustomException(ErrorCode.MATCH_NOT_FOUND));
        Quote quote = quoteRepository.findById(match.getQuoteId())
                .orElseThrow(() -> new CustomException(ErrorCode.INVALID_REQUEST));

        boolean isShipperOwner = "ROLE_SHIPPER".equals(role) && quote.getShipperId().equals(userId);
        boolean isMatchedDriver = "ROLE_DRIVER".equals(role) && userId.equals(match.getDriverId());
        // 오픈 매칭(아직 수락 안 됨)은 기사도 조회 가능
        boolean isOpenMatch = "ROLE_DRIVER".equals(role) && !match.getAccepted() && match.getDriverId() == null;

        if (!isShipperOwner && !isMatchedDriver && !isOpenMatch) {
            throw new CustomException(ErrorCode.AUTH_FORBIDDEN);
        }
        return MatchResponse.from(match);
    }

    @Transactional(readOnly = true)
    public List<MatchResponse> getDriverMatches(Long driverId) {
        return matchRepository.findByDriverIdAndStatusNot(driverId, Match.Status.CANCELLED)
                .stream()
                .map(MatchResponse::from)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<MatchResponse> getShipperMatches(Long shipperId) {
        return matchRepository.findByShipperIdAndStatusNotCancelled(shipperId)
                .stream()
                .map(MatchResponse::from)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public MatchResponse getMatchByQuoteId(Long quoteId) {
        Match match = matchRepository.findByQuoteId(quoteId)
                .orElseThrow(() -> new CustomException(ErrorCode.MATCH_NOT_FOUND));
        return MatchResponse.from(match);
    }

    @Transactional
    public MatchResponse startTransit(Long driverId, Long matchId) {
        Match match = matchRepository.findById(matchId)
                .orElseThrow(() -> new CustomException(ErrorCode.MATCH_NOT_FOUND));

        if (!Boolean.TRUE.equals(match.getAccepted())
                || match.getDriverId() == null
                || !match.getDriverId().equals(driverId)) {
            throw new CustomException(ErrorCode.AUTH_FORBIDDEN);
        }
        if (match.getStatus() != Match.Status.READY) {
            throw new CustomException(ErrorCode.INVALID_REQUEST);
        }
        if (!paymentRepository.existsByMatchIdAndStatus(matchId, Payment.PaymentStatus.COMPLETED)) {
            throw new CustomException(ErrorCode.MATCH_PAYMENT_REQUIRED);
        }

        Quote quote = quoteRepository.findById(match.getQuoteId())
                .orElseThrow(() -> new CustomException(ErrorCode.INVALID_REQUEST));

        match.startTransit();
        quote.markInTransit();

        Match saved = matchRepository.save(match);
        quoteRepository.save(quote);

        notificationService.createNotification(
                FcmToken.UserType.SHIPPER,
                quote.getShipperId(),
                saved.getMatchId(),
                Notification.Type.MATCH_UPDATED,
                "기사가 상차를 완료하여 운송이 시작되었습니다."
        );

        return MatchResponse.from(saved);
    }

    @Transactional
    public MatchResponse completeTransit(Long driverId, Long matchId) {
        Match match = matchRepository.findById(matchId)
                .orElseThrow(() -> new CustomException(ErrorCode.MATCH_NOT_FOUND));

        if (!Boolean.TRUE.equals(match.getAccepted())
                || match.getDriverId() == null
                || !match.getDriverId().equals(driverId)) {
            throw new CustomException(ErrorCode.AUTH_FORBIDDEN);
        }
        if (match.getStatus() != Match.Status.IN_TRANSIT) {
            throw new CustomException(ErrorCode.INVALID_REQUEST);
        }

        Quote quote = quoteRepository.findById(match.getQuoteId())
                .orElseThrow(() -> new CustomException(ErrorCode.INVALID_REQUEST));

        match.complete();
        quote.markDelivered();

        Match saved = matchRepository.save(match);
        quoteRepository.save(quote);

        notificationService.createNotification(
                FcmToken.UserType.SHIPPER,
                quote.getShipperId(),
                saved.getMatchId(),
                Notification.Type.MATCH_UPDATED,
                "기사가 배송을 완료했습니다. 화주가 이행 확인 후 정산을 확정해 주세요."
        );

        return MatchResponse.from(saved);
    }

    @Transactional
    public int releaseTimedOutAwaitingPaymentMatches(int timeoutMinutes) {
        int safeTimeoutMinutes = Math.max(1, timeoutMinutes);
        LocalDateTime cutoff = LocalDateTime.now().minusMinutes(safeTimeoutMinutes);
        List<Match> expiredAccepted = matchRepository.findByAcceptedTrueAndStatusAndAcceptedAtBefore(Match.Status.READY, cutoff);

        int releasedCount = 0;
        for (Match match : expiredAccepted) {
            if (paymentRepository.existsByMatchIdAndStatus(match.getMatchId(), Payment.PaymentStatus.COMPLETED)) {
                continue;
            }

            List<Payment> pendingPayments = paymentRepository.findByMatchIdAndStatus(match.getMatchId(), Payment.PaymentStatus.PENDING);
            for (Payment pending : pendingPayments) {
                pending.fail();
            }

            Quote quote = quoteRepository.findById(match.getQuoteId())
                    .orElseThrow(() -> new CustomException(ErrorCode.INVALID_REQUEST));
            Long prevDriverId = match.getDriverId();

            match.releaseForRematch();
            quote.reopen();

            matchRepository.save(match);
            quoteRepository.save(quote);
            releasedCount += 1;

            if (prevDriverId != null) {
                notificationService.createNotification(
                        FcmToken.UserType.DRIVER,
                        prevDriverId,
                        match.getMatchId(),
                        Notification.Type.MATCH_UPDATED,
                        "결제 대기 시간이 초과되어 매칭이 해제되었습니다."
                );
            }
            notificationService.createNotification(
                    FcmToken.UserType.SHIPPER,
                    quote.getShipperId(),
                    match.getMatchId(),
                    Notification.Type.MATCH_UPDATED,
                    "결제 대기 시간이 초과되어 매칭이 다시 오픈되었습니다."
            );
        }

        return releasedCount;
    }
}
