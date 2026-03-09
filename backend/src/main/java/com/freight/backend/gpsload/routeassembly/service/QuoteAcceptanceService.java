package com.freight.backend.gpsload.routeassembly.service;

import com.freight.backend.dto.match.BatchAcceptMatchRequest;
import com.freight.backend.dto.match.BatchAcceptMatchResponse;
import com.freight.backend.dto.match.MatchResponse;
import com.freight.backend.entity.Match;
import com.freight.backend.entity.Quote;
import com.freight.backend.exception.CustomException;
import com.freight.backend.exception.ErrorCode;
import com.freight.backend.gpsload.routeassembly.model.RouteAcceptRequest;
import com.freight.backend.gpsload.routeassembly.model.RouteAcceptResponse;
import com.freight.backend.repository.MatchRepository;
import com.freight.backend.repository.QuoteRepository;
import com.freight.backend.service.MatchService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * 추천 수락 처리 서비스.
 * route-assembly 수락을 기존 MatchService 파이프라인에 통합해
 * 매칭/견적/알림 상태 전이를 동일하게 유지한다.
 */
@Service
public class QuoteAcceptanceService {

    private final QuoteRepository quoteRepository;
    private final MatchRepository matchRepository;
    private final MatchService matchService;

    public QuoteAcceptanceService(
            QuoteRepository quoteRepository,
            MatchRepository matchRepository,
            MatchService matchService
    ) {
        this.quoteRepository = quoteRepository;
        this.matchRepository = matchRepository;
        this.matchService = matchService;
    }

    @Transactional
    public RouteAcceptResponse accept(Long authenticatedDriverId, RouteAcceptRequest request) {
        if (authenticatedDriverId == null || authenticatedDriverId <= 0) {
            return RouteAcceptResponse.failure("인증된 기사 정보가 없습니다.", 0, 0, List.of());
        }
        if (request == null || !request.hasValidQuoteIds()) {
            return RouteAcceptResponse.failure("유효하지 않은 수락 요청입니다.", 0, 0, List.of());
        }

        if (request.driverId() != null && !request.driverId().equals(authenticatedDriverId)) {
            return RouteAcceptResponse.failure("요청 기사 정보가 인증 정보와 일치하지 않습니다.", 0, 0, List.of());
        }

        List<Long> quoteIds = normalizeQuoteIds(request.quoteIds());
        int requestedCount = quoteIds.size();
        if (requestedCount == 0) {
            return RouteAcceptResponse.failure("수락할 견적이 없습니다.", 0, 0, List.of());
        }

        List<Quote> quotes = quoteRepository.findAllById(quoteIds);
        if (quotes.size() != requestedCount) {
            return RouteAcceptResponse.failure(
                    "수락 실패: 일부 견적이 존재하지 않습니다.",
                    requestedCount,
                    0,
                    List.of()
            );
        }

        boolean hasNonOpenQuote = quotes.stream().anyMatch(quote -> quote == null || !quote.isOpen());
        if (hasNonOpenQuote) {
            return RouteAcceptResponse.failure(
                    "수락 실패: 일부 견적이 이미 배정되었거나 OPEN 상태가 아닙니다.",
                    requestedCount,
                    0,
                    List.of()
            );
        }
        if (hasExpiredSchedule(quotes, LocalDateTime.now())) {
            return RouteAcceptResponse.failure(
                    "수락 실패: 배송 마감 시간이 지난 견적이 포함되어 있습니다. 견적 조합을 다시 선택해주세요.",
                    requestedCount,
                    0,
                    List.of()
            );
        }

        try {
            List<Long> matchIds = ensureReadyMatchesForQuotes(quoteIds);
            BatchAcceptMatchRequest batchRequest = new BatchAcceptMatchRequest();
            batchRequest.setMatchIds(matchIds);
            batchRequest.setOrderedQuoteIds(quoteIds);
            batchRequest.setRouteType(quoteIds.size() > 1 ? "BUNDLED" : "SINGLE");

            BatchAcceptMatchResponse accepted = matchService.acceptMatches(authenticatedDriverId, batchRequest);
            List<Long> acceptedQuoteIds = extractAcceptedQuoteIds(accepted);
            int acceptedCount = acceptedQuoteIds.size();
            if (acceptedCount == 0 && accepted != null && accepted.getAcceptedCount() != null && accepted.getAcceptedCount() > 0) {
                acceptedCount = accepted.getAcceptedCount();
                acceptedQuoteIds = quoteIds;
            }

            if (acceptedCount != requestedCount) {
                return RouteAcceptResponse.failure(
                        "수락 실패: 일부 견적만 처리되었습니다.",
                        requestedCount,
                        acceptedCount,
                        acceptedQuoteIds
                );
            }

            return RouteAcceptResponse.success(
                    "수락 완료: 매칭이 생성/수락되어 정상 흐름으로 반영되었습니다.",
                    requestedCount,
                    acceptedCount,
                    acceptedQuoteIds
            );
        } catch (CustomException e) {
            return RouteAcceptResponse.failure(
                    "수락 실패: " + e.getErrorCode().getMessage(),
                    requestedCount,
                    0,
                    List.of()
            );
        } catch (RuntimeException e) {
            return RouteAcceptResponse.failure(
                    "수락 실패: 처리 중 오류가 발생했습니다.",
                    requestedCount,
                    0,
                    List.of()
            );
        }
    }

    private List<Long> normalizeQuoteIds(List<Long> quoteIds) {
        if (quoteIds == null || quoteIds.isEmpty()) {
            return List.of();
        }
        Set<Long> uniqueIds = new LinkedHashSet<>();
        for (Long quoteId : quoteIds) {
            if (quoteId != null && quoteId > 0) {
                uniqueIds.add(quoteId);
            }
        }
        return new ArrayList<>(uniqueIds);
    }

    private List<Long> ensureReadyMatchesForQuotes(List<Long> quoteIds) {
        Map<Long, List<Match>> matchesByQuoteId = matchRepository.findByQuoteIdIn(quoteIds).stream()
                .collect(Collectors.groupingBy(Match::getQuoteId));

        List<Long> matchIds = new ArrayList<>(quoteIds.size());
        for (Long quoteId : quoteIds) {
            Match existing = matchesByQuoteId.getOrDefault(quoteId, List.of()).stream()
                    .filter(match -> match.getStatus() != Match.Status.CANCELLED)
                    .max(Comparator.comparing(Match::getUpdatedAt, Comparator.nullsLast(Comparator.naturalOrder())))
                    .orElse(null);

            if (existing == null) {
                Match created = matchRepository.save(Match.builder()
                        .quoteId(quoteId)
                        .accepted(false)
                        .status(Match.Status.READY)
                        .build());
                matchIds.add(created.getMatchId());
                continue;
            }

            if (Boolean.TRUE.equals(existing.getAccepted())
                    || existing.getDriverId() != null
                    || existing.getStatus() != Match.Status.READY) {
                throw new CustomException(ErrorCode.MATCH_ALREADY_ACCEPTED);
            }

            matchIds.add(existing.getMatchId());
        }
        return matchIds;
    }

    private List<Long> extractAcceptedQuoteIds(BatchAcceptMatchResponse response) {
        if (response == null || response.getMatches() == null || response.getMatches().isEmpty()) {
            return List.of();
        }
        List<Long> acceptedQuoteIds = new ArrayList<>();
        for (MatchResponse match : response.getMatches()) {
            if (match == null || match.getQuoteId() == null || match.getQuoteId() <= 0) {
                continue;
            }
            acceptedQuoteIds.add(match.getQuoteId());
        }
        return acceptedQuoteIds;
    }

    private boolean hasExpiredSchedule(List<Quote> quotes, LocalDateTime now) {
        if (quotes == null || quotes.isEmpty()) {
            return false;
        }
        LocalDateTime baseline = now != null ? now : LocalDateTime.now();
        for (Quote quote : quotes) {
            if (quote == null) {
                continue;
            }
            LocalDateTime effectiveDeadline = quote.getDeliveryDeadline() != null
                    ? quote.getDeliveryDeadline()
                    : quote.getDeliverySchedule();
            if (effectiveDeadline != null && effectiveDeadline.isBefore(baseline)) {
                return true;
            }
        }
        return false;
    }
}
