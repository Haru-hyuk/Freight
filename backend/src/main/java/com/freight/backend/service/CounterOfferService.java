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
import java.util.List;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class CounterOfferService {

    private final CounterOfferRepository counterOfferRepository;
    private final QuoteRepository quoteRepository;
    private final MatchRepository matchRepository;
    private final NotificationService notificationService;

    @Transactional
    public CounterOfferResponse createOffer(Long driverId, Long quoteId, CounterOfferCreateRequest request) {
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

        notificationService.createNotification(
                FcmToken.UserType.SHIPPER,
                quote.getShipperId(),
                null,
                com.freight.backend.entity.Notification.Type.COUNTER_OFFER_CREATED,
                "Driver sent a counter offer."
        );

        return CounterOfferResponse.from(saved);
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
        if (offer.getStatus() != CounterOffer.Status.PENDING) {
            throw new CustomException(ErrorCode.INVALID_REQUEST);
        }
        if (!quote.isOpen()) {
            throw new CustomException(ErrorCode.QUOTE_NOT_OPEN);
        }

        Match match = resolveOrCreateAcceptedMatch(quote.getQuoteId(), offer.getDriverId());

        quote.markMatched();
        quoteRepository.save(quote);

        offer.accept();
        CounterOffer savedOffer = counterOfferRepository.save(offer);

        notificationService.createNotification(
                FcmToken.UserType.DRIVER,
                offer.getDriverId(),
                match.getMatchId(),
                com.freight.backend.entity.Notification.Type.COUNTER_OFFER_ACCEPTED,
                "Shipper accepted your counter offer."
        );

        return CounterOfferAcceptResponse.of(savedOffer, match, quote.getStatus());
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
        if (offer.getStatus() != CounterOffer.Status.PENDING) {
            throw new CustomException(ErrorCode.INVALID_REQUEST);
        }

        offer.reject();
        counterOfferRepository.save(offer);

        notificationService.createNotification(
                FcmToken.UserType.DRIVER,
                offer.getDriverId(),
                null,
                com.freight.backend.entity.Notification.Type.COUNTER_OFFER_REJECTED,
                "Shipper rejected your counter offer."
        );
    }

    private Match resolveOrCreateAcceptedMatch(Long quoteId, Long driverId) {
        Match existing = matchRepository.findByQuoteId(quoteId).orElse(null);
        if (existing == null || existing.getStatus() == Match.Status.CANCELLED) {
            Match created = Match.builder()
                    .quoteId(quoteId)
                    .driverId(driverId)
                    .accepted(true)
                    .acceptedAt(LocalDateTime.now())
                    .status(Match.Status.READY)
                    .build();
            created.assignGroup(null, "SINGLE", 1);
            return matchRepository.save(created);
        }

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
        return matchRepository.save(accepted);
    }
}
