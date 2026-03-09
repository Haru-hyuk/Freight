package com.freight.backend.service;

import com.freight.backend.dto.counter.CounterOfferAcceptResponse;
import com.freight.backend.dto.counter.CounterOfferCreateRequest;
import com.freight.backend.dto.counter.CounterOfferResponse;
import com.freight.backend.entity.CounterOffer;
import com.freight.backend.entity.FcmToken;
import com.freight.backend.entity.Match;
import com.freight.backend.entity.Quote;
import com.freight.backend.exception.CustomException;
import com.freight.backend.exception.ErrorCode;
import com.freight.backend.repository.CounterOfferRepository;
import com.freight.backend.repository.MatchRepository;
import com.freight.backend.repository.QuoteRepository;
import java.time.LocalDateTime;
import java.util.Comparator;
import java.util.List;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.orm.ObjectOptimisticLockingFailureException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Slf4j
public class CounterOfferService {

    private final CounterOfferRepository counterOfferRepository;
    private final QuoteRepository quoteRepository;
    private final MatchRepository matchRepository;
    private final NotificationService notificationService;

    @Transactional
    public CounterOfferResponse createOffer(Long driverId, Long quoteId, CounterOfferCreateRequest request) {
        // 바인딩/검증 편차와 무관하게 역제안 최소 입력 조건을 서비스에서 보장한다.
        validateCreateRequest(request);

        Quote quote = quoteRepository.findById(quoteId)
                .orElseThrow(() -> new CustomException(ErrorCode.INVALID_REQUEST));

        if (!quote.isOpen()) {
            throw new CustomException(ErrorCode.QUOTE_NOT_OPEN);
        }

        if (counterOfferRepository.existsByQuoteIdAndDriverIdAndStatus(
                quoteId, driverId, CounterOffer.Status.PENDING
        )) {
            throw new CustomException(ErrorCode.INVALID_REQUEST);
        }

        CounterOffer offer = CounterOffer.builder()
                .quoteId(quoteId)
                .driverId(driverId)
                .proposedPrice(request.getProposedPrice())
                .message(request.getMessage())
                .build();

        CounterOffer saved = counterOfferRepository.save(offer);
        Long notificationMatchId = requireNotificationMatchId(quoteId);

        notificationService.createNotification(
                FcmToken.UserType.SHIPPER,
                quote.getShipperId(),
                notificationMatchId,
                com.freight.backend.entity.Notification.Type.COUNTER_OFFER_CREATED,
                "Driver sent a counter offer."
        );

        return CounterOfferResponse.from(saved);
    }

    private void validateCreateRequest(CounterOfferCreateRequest request) {
        if (request == null) {
            throw new CustomException(ErrorCode.INVALID_REQUEST);
        }
        Integer proposedPrice = request.getProposedPrice();
        String message = request.getMessage();
        boolean hasMessage = message != null && !message.isBlank();
        if (proposedPrice != null && proposedPrice <= 0) {
            throw new CustomException(ErrorCode.INVALID_REQUEST);
        }
        if (proposedPrice == null && !hasMessage) {
            throw new CustomException(ErrorCode.INVALID_REQUEST);
        }
    }

    @Transactional(readOnly = true)
    public List<CounterOfferResponse> getOffersForQuote(Long shipperId, Long quoteId) {
        Quote quote = quoteRepository.findById(quoteId)
                .orElseThrow(() -> new CustomException(ErrorCode.INVALID_REQUEST));
        if (!quote.getShipperId().equals(shipperId)) {
            throw new CustomException(ErrorCode.AUTH_FORBIDDEN);
        }
        return counterOfferRepository.findByQuoteIdOrderByCreatedAtDesc(quoteId)
                .stream()
                .map(CounterOfferResponse::from)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<CounterOfferResponse> getMyOffers(Long driverId) {
        return counterOfferRepository.findByDriverIdOrderByCreatedAtDesc(driverId)
                .stream()
                .map(CounterOfferResponse::from)
                .collect(Collectors.toList());
    }

    @Transactional
    public CounterOfferAcceptResponse acceptOffer(Long shipperId, Long offerId) {
        CounterOffer offer = counterOfferRepository.findById(offerId)
                .orElseThrow(() -> new CustomException(ErrorCode.INVALID_REQUEST));
        Quote quote = quoteRepository.findById(offer.getQuoteId())
                .orElseThrow(() -> new CustomException(ErrorCode.INVALID_REQUEST));

        if (!quote.getShipperId().equals(shipperId)) {
            throw new CustomException(ErrorCode.AUTH_FORBIDDEN);
        }
        if (!quote.isOpen()) {
            throw new CustomException(ErrorCode.QUOTE_NOT_OPEN);
        }

        Match match = resolveAcceptedReadyMatch(quote.getQuoteId(), offer.getDriverId());

        int quoteUpdated = quoteRepository.updateStatusIfCurrent(
                quote.getQuoteId(),
                "OPEN",
                "MATCHED",
                LocalDateTime.now()
        );
        if (quoteUpdated == 0) {
            throw new CustomException(ErrorCode.QUOTE_NOT_OPEN);
        }

        int offerUpdated = counterOfferRepository.updateStatusIfCurrent(
                offer.getCounterOfferId(),
                CounterOffer.Status.PENDING,
                CounterOffer.Status.ACCEPTED,
                LocalDateTime.now()
        );
        if (offerUpdated == 0) {
            throw new CustomException(ErrorCode.INVALID_REQUEST);
        }
        CounterOffer savedOffer = counterOfferRepository.findById(offer.getCounterOfferId())
                .orElseThrow(() -> new CustomException(ErrorCode.INVALID_REQUEST));

        notificationService.createNotification(
                FcmToken.UserType.DRIVER,
                offer.getDriverId(),
                match.getMatchId(),
                com.freight.backend.entity.Notification.Type.COUNTER_OFFER_ACCEPTED,
                "Shipper accepted your counter offer."
        );

        return CounterOfferAcceptResponse.of(savedOffer, match, "MATCHED");
    }

    @Transactional
    public void rejectOffer(Long shipperId, Long offerId) {
        CounterOffer offer = counterOfferRepository.findById(offerId)
                .orElseThrow(() -> new CustomException(ErrorCode.INVALID_REQUEST));
        Quote quote = quoteRepository.findById(offer.getQuoteId())
                .orElseThrow(() -> new CustomException(ErrorCode.INVALID_REQUEST));

        if (!quote.getShipperId().equals(shipperId)) {
            throw new CustomException(ErrorCode.AUTH_FORBIDDEN);
        }
        int updated = counterOfferRepository.updateStatusIfCurrent(
                offer.getCounterOfferId(),
                CounterOffer.Status.PENDING,
                CounterOffer.Status.REJECTED,
                LocalDateTime.now()
        );
        if (updated == 0) {
            throw new CustomException(ErrorCode.INVALID_REQUEST);
        }
        Long notificationMatchId = requireNotificationMatchId(offer.getQuoteId());

        notificationService.createNotification(
                FcmToken.UserType.DRIVER,
                offer.getDriverId(),
                notificationMatchId,
                com.freight.backend.entity.Notification.Type.COUNTER_OFFER_REJECTED,
                "Shipper rejected your counter offer."
        );
    }

    private Match resolveAcceptedReadyMatch(Long quoteId, Long driverId) {
        Match existing = findLatestActiveMatch(quoteId);
        if (existing.getStatus() != Match.Status.READY) {
            throw new CustomException(ErrorCode.INVALID_REQUEST);
        }

        if (Boolean.TRUE.equals(existing.getAccepted())) {
            if (existing.getDriverId() != null && existing.getDriverId().equals(driverId)) {
                return existing;
            }
            throw new CustomException(ErrorCode.MATCH_ALREADY_ACCEPTED);
        }

        int updated = matchRepository.acceptIfAvailable(existing.getMatchId(), driverId, LocalDateTime.now());
        if (updated == 0) {
            throw new CustomException(ErrorCode.MATCH_ALREADY_ACCEPTED);
        }

        Match accepted = matchRepository.findById(existing.getMatchId())
                .orElseThrow(() -> new CustomException(ErrorCode.MATCH_NOT_FOUND));
        accepted.assignGroup(null, "SINGLE", 1);

        try {
            return matchRepository.save(accepted);
        } catch (ObjectOptimisticLockingFailureException e) {
            // 낙관적 락 충돌 - 다른 기사가 먼저 수락함
            log.warn("Counter Offer 수락 중 낙관적 락 충돌 발생. quoteId={}, driverId={}", quoteId, driverId);
            throw new CustomException(ErrorCode.MATCH_ALREADY_ACCEPTED);
        }
    }

    private Long requireNotificationMatchId(Long quoteId) {
        return findLatestActiveMatch(quoteId).getMatchId();
    }

    private Match findLatestActiveMatch(Long quoteId) {
        return matchRepository.findAllByQuoteId(quoteId).stream()
                .filter(match -> match.getStatus() != Match.Status.CANCELLED)
                .max(Comparator.comparing(Match::getMatchId))
                .orElseThrow(() -> new CustomException(ErrorCode.INVALID_REQUEST));
    }
}
