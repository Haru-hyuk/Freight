package com.freight.backend.service;

import com.freight.backend.dto.match.MatchResponse;
import com.freight.backend.entity.Match;
import com.freight.backend.entity.Notification;
import com.freight.backend.entity.Quote;
import com.freight.backend.exception.CustomException;
import com.freight.backend.exception.ErrorCode;
import com.freight.backend.repository.MatchRepository;
import com.freight.backend.repository.QuoteRepository;
import java.util.List;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * 매칭 서비스
 * - 매칭 생성, 수락, 취소 등 핵심 비즈니스 로직
 */
@Service
@RequiredArgsConstructor
public class MatchService {

    private final MatchRepository matchRepository;
    private final QuoteRepository quoteRepository;
    private final NotificationService notificationService;

    /**
     * 매칭 생성 (화주)
     * - 견적이 본인 소유이고 상태가 OPEN일 때만 생성 가능
     * - 생성 시 driverId=null, accepted=false
     */
    @Transactional
    public MatchResponse createMatch(Long shipperId, Long quoteId) {
        Quote quote = quoteRepository.findById(quoteId)
                .orElseThrow(() -> new CustomException(ErrorCode.INVALID_REQUEST));

        // 본인 견적인지 확인
        if (!quote.getShipperId().equals(shipperId)) {
            throw new CustomException(ErrorCode.AUTH_FORBIDDEN);
        }

        // 견적이 OPEN 상태인지 확인
        if (!quote.isOpen()) {
            throw new CustomException(ErrorCode.QUOTE_NOT_OPEN);
        }

        // 동일 견적에 이미 매칭이 있으면 생성 불가 (견적 1 : 매칭 1)
        if (matchRepository.existsByQuoteIdAndStatusNot(quoteId, Match.Status.CANCELLED)) {
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
                shipperId,
                saved.getMatchId(),
                Notification.Type.MATCH_CREATED,
                "견적에 대한 매칭이 생성되었습니다."
        );
        return MatchResponse.from(saved);
    }

    /**
     * 수락 가능 매칭 목록 조회 (기사)
     * - accepted=false이고 status=READY인 매칭만 반환
     */
    @Transactional(readOnly = true)
    public List<MatchResponse> getOpenMatches() {
        return matchRepository.findByAcceptedFalseAndStatus(Match.Status.READY)
                .stream()
                .map(MatchResponse::from)
                .collect(Collectors.toList());
    }

    /**
     * 매칭 수락 (기사)
     * - 아직 수락되지 않은 매칭만 수락 가능
     * - 수락 시 견적 상태를 MATCHED로 변경
     */
    @Transactional
    public MatchResponse acceptMatch(Long driverId, Long matchId) {
        Match match = matchRepository.findById(matchId)
                .orElseThrow(() -> new CustomException(ErrorCode.MATCH_NOT_FOUND));

        // 이미 수락된 매칭인지 확인
        if (match.getAccepted()) {
            throw new CustomException(ErrorCode.MATCH_ALREADY_ACCEPTED);
        }

        // 매칭 수락 처리
        match.accept(driverId);

        // 견적 상태 변경
        Quote quote = quoteRepository.findById(match.getQuoteId())
                .orElseThrow(() -> new CustomException(ErrorCode.INVALID_REQUEST));
        quote.markMatched();
        quoteRepository.save(quote);

        Match saved = matchRepository.save(match);
        notificationService.createNotification(
                quote.getShipperId(),
                saved.getMatchId(),
                Notification.Type.MATCH_ACCEPTED,
                "기사님이 매칭을 수락했습니다."
        );
        return MatchResponse.from(saved);
    }

    /**
     * 매칭 취소 (화주 또는 기사)
     * - 화주: 본인 견적의 매칭만 취소 가능
     * - 기사: 본인이 수락한 매칭만 취소 가능
     * - 취소 시 견적 상태를 OPEN으로 되돌림
     */
    @Transactional
    public void cancelMatch(Long userId, String role, Long matchId) {
        Match match = matchRepository.findById(matchId)
                .orElseThrow(() -> new CustomException(ErrorCode.MATCH_NOT_FOUND));

        Quote quote = quoteRepository.findById(match.getQuoteId())
                .orElseThrow(() -> new CustomException(ErrorCode.INVALID_REQUEST));

        // 권한 확인 (미수락 시 driverId=null)
        boolean isShipperOwner = "ROLE_SHIPPER".equals(role) && quote.getShipperId().equals(userId);
        boolean isMatchedDriver = "ROLE_DRIVER".equals(role) && match.getDriverId() != null && match.getDriverId().equals(userId);

        if (!isShipperOwner && !isMatchedDriver) {
            throw new CustomException(ErrorCode.AUTH_FORBIDDEN);
        }

        // 매칭 취소 및 견적 상태 복원
        match.cancel();
        quote.reopen();

        matchRepository.save(match);
        quoteRepository.save(quote);

        Long driverId = match.getDriverId();
        if ("ROLE_SHIPPER".equals(role) && driverId != null) {
            notificationService.createNotification(
                    driverId,
                    match.getMatchId(),
                    Notification.Type.MATCH_CANCELLED,
                    "화주가 매칭을 취소했습니다."
            );
        }
        if ("ROLE_DRIVER".equals(role)) {
            notificationService.createNotification(
                    quote.getShipperId(),
                    match.getMatchId(),
                    Notification.Type.MATCH_CANCELLED,
                    "기사님이 매칭을 취소했습니다."
            );
        }
    }

    /**
     * 매칭 상세 조회.
     * 해당 매칭의 견적 소유 화주 또는 수락한 기사만 조회 가능.
     *
     * @param userId 인증된 사용자 ID (null이면 403)
     * @param role   ROLE_SHIPPER 또는 ROLE_DRIVER
     */
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

        if (!isShipperOwner && !isMatchedDriver) {
            throw new CustomException(ErrorCode.AUTH_FORBIDDEN);
        }
        return MatchResponse.from(match);
    }

    /**
     * 기사가 수락한 매칭 목록 (취소 제외, 진행 중인 것만)
     */
    @Transactional(readOnly = true)
    public List<MatchResponse> getDriverMatches(Long driverId) {
        return matchRepository.findByDriverIdAndStatusNot(driverId, Match.Status.CANCELLED)
                .stream()
                .map(MatchResponse::from)
                .collect(Collectors.toList());
    }

    /**
     * 화주가 생성한 매칭 목록 (본인 견적의 매칭, 취소 제외)
     */
    @Transactional(readOnly = true)
    public List<MatchResponse> getShipperMatches(Long shipperId) {
        return matchRepository.findByShipperIdAndStatusNotCancelled(shipperId)
                .stream()
                .map(MatchResponse::from)
                .collect(Collectors.toList());
    }

    /**
     * 견적 ID로 매칭 조회
     */
    @Transactional(readOnly = true)
    public MatchResponse getMatchByQuoteId(Long quoteId) {
        Match match = matchRepository.findByQuoteId(quoteId)
                .orElseThrow(() -> new CustomException(ErrorCode.MATCH_NOT_FOUND));
        return MatchResponse.from(match);
    }
}
