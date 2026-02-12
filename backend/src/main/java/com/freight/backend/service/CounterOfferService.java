package com.freight.backend.service;

import com.freight.backend.dto.counter.CounterOfferCreateRequest;
import com.freight.backend.dto.counter.CounterOfferResponse;
import com.freight.backend.entity.CounterOffer;
import com.freight.backend.entity.Quote;
import com.freight.backend.exception.CustomException;
import com.freight.backend.exception.ErrorCode;
import com.freight.backend.repository.CounterOfferRepository;
import com.freight.backend.repository.QuoteRepository;
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
                quote.getShipperId(),
                null,
                com.freight.backend.entity.Notification.Type.COUNTER_OFFER_CREATED,
                "기사님이 새로운 금액을 제안했습니다."
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
    public void acceptOffer(Long shipperId, Long offerId) {
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

        offer.accept();
        counterOfferRepository.save(offer);

        notificationService.createNotification(
                offer.getDriverId(),
                null,
                com.freight.backend.entity.Notification.Type.COUNTER_OFFER_ACCEPTED,
                "화주가 제안을 수락했습니다."
        );
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
                offer.getDriverId(),
                null,
                com.freight.backend.entity.Notification.Type.COUNTER_OFFER_REJECTED,
                "화주가 제안을 거절했습니다."
        );
    }
}
