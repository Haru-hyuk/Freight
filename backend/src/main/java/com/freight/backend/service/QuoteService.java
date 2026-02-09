package com.freight.backend.service;

import com.freight.backend.dto.quote.QuoteChecklistItemRequest;
import com.freight.backend.dto.quote.QuoteChecklistItemResponse;
import com.freight.backend.dto.quote.QuoteCreateRequest;
import com.freight.backend.dto.quote.QuoteCreateResponse;
import com.freight.backend.dto.quote.QuoteDetailResponse;
import com.freight.backend.dto.quote.QuoteListResponse;
import com.freight.backend.dto.quote.QuoteUpdateRequest;
import com.freight.backend.entity.Quote;
import com.freight.backend.entity.QuoteChecklistItem;
import com.freight.backend.exception.CustomException;
import com.freight.backend.exception.ErrorCode;
import com.freight.backend.repository.QuoteChecklistItemRepository;
import com.freight.backend.repository.QuoteRepository;
import jakarta.transaction.Transactional;
import java.math.BigDecimal;
import java.util.Collections;
import java.util.List;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class QuoteService {

    private final QuoteRepository quoteRepository;
    private final QuoteChecklistItemRepository quoteChecklistItemRepository;

    @Transactional
    public QuoteCreateResponse createQuote(QuoteCreateRequest req) {
        Long shipperId = getCurrentShipperId();

        int extraPrice = calculateExtraPrice(req.getChecklistItems());
        int finalPrice = safeInt(req.getBasePrice())
                + safeInt(req.getDistancePrice())
                + extraPrice;
        int desiredPrice = req.getDesiredPrice() != null ? req.getDesiredPrice() : finalPrice;

        Quote quote = Quote.builder()
                .shipperId(shipperId)
                .truckId(req.getTruckId())
                .originAddress(req.getOriginAddress())
                .destinationAddress(req.getDestinationAddress())
                .originLat(req.getOriginLat())
                .originLng(req.getOriginLng())
                .destinationLat(req.getDestinationLat())
                .destinationLng(req.getDestinationLng())
                .distanceKm(req.getDistanceKm())
                .weightKg(req.getWeightKg())
                .volumeCbm(req.getVolumeCbm())
                .cargoType(req.getCargoType())
                .cargoDesc(req.getCargoDesc())
                .basePrice(safeInt(req.getBasePrice()))
                .distancePrice(safeInt(req.getDistancePrice()))
                .extraPrice(extraPrice)
                .desiredPrice(desiredPrice)
                .finalPrice(finalPrice)
                .allowCombine(Boolean.TRUE.equals(req.getAllowCombine()))
                .loadMethod(req.getLoadMethod())
                .unloadMethod(req.getUnloadMethod())
                .status("OPEN")
                .build();

        Quote saved = quoteRepository.save(quote);

        List<QuoteChecklistItemRequest> items = req.getChecklistItems();
        if (items != null) {
            for (QuoteChecklistItemRequest item : items) {
                BigDecimal fee = item.getExtraFee() == null ? BigDecimal.ZERO : item.getExtraFee();
                QuoteChecklistItem entity = QuoteChecklistItem.builder()
                        .quoteId(saved.getQuoteId())
                        .checklistItemId(item.getChecklistItemId())
                        .extraInput(item.getExtraInput())
                        .extraFee(fee)
                        .build();
                quoteChecklistItemRepository.save(entity);
            }
        }

        return new QuoteCreateResponse(saved.getQuoteId());
    }

    @Transactional
    public List<QuoteListResponse> listQuotes() {
        Long shipperId = getCurrentShipperId();
        return quoteRepository.findByShipperId(shipperId).stream()
                .map(this::toListResponse)
                .collect(Collectors.toList());
    }

    @Transactional
    public QuoteDetailResponse getQuote(Long quoteId) {
        Long shipperId = getCurrentShipperId();
        Quote quote = getOwnedQuote(quoteId, shipperId);
        List<QuoteChecklistItemResponse> items = quoteChecklistItemRepository.findByQuoteId(quoteId).stream()
                .map(this::toItemResponse)
                .collect(Collectors.toList());
        return toDetailResponse(quote, items);
    }

    @Transactional
    public QuoteDetailResponse updateQuote(Long quoteId, QuoteUpdateRequest req) {
        Long shipperId = getCurrentShipperId();
        Quote quote = getOwnedQuote(quoteId, shipperId);

        int extraPrice = calculateExtraPrice(req.getChecklistItems());
        int finalPrice = safeInt(req.getBasePrice())
                + safeInt(req.getDistancePrice())
                + extraPrice;
        int desiredPrice = req.getDesiredPrice() != null ? req.getDesiredPrice() : finalPrice;

        quote.updateFrom(
                req.getTruckId(),
                req.getOriginAddress(),
                req.getDestinationAddress(),
                req.getOriginLat(),
                req.getOriginLng(),
                req.getDestinationLat(),
                req.getDestinationLng(),
                req.getDistanceKm(),
                req.getWeightKg(),
                req.getVolumeCbm(),
                req.getCargoType(),
                req.getCargoDesc(),
                safeInt(req.getBasePrice()),
                safeInt(req.getDistancePrice()),
                extraPrice,
                desiredPrice,
                finalPrice,
                Boolean.TRUE.equals(req.getAllowCombine()),
                req.getLoadMethod(),
                req.getUnloadMethod()
        );

        quoteChecklistItemRepository.deleteByQuoteId(quoteId);
        List<QuoteChecklistItemRequest> items = req.getChecklistItems();
        if (items != null) {
            for (QuoteChecklistItemRequest item : items) {
                BigDecimal fee = item.getExtraFee() == null ? BigDecimal.ZERO : item.getExtraFee();
                QuoteChecklistItem entity = QuoteChecklistItem.builder()
                        .quoteId(quoteId)
                        .checklistItemId(item.getChecklistItemId())
                        .extraInput(item.getExtraInput())
                        .extraFee(fee)
                        .build();
                quoteChecklistItemRepository.save(entity);
            }
        }

        List<QuoteChecklistItemResponse> responses = items == null
                ? Collections.emptyList()
                : items.stream()
                .map(item -> new QuoteChecklistItemResponse(
                        item.getChecklistItemId(),
                        item.getExtraInput(),
                        item.getExtraFee() == null ? BigDecimal.ZERO : item.getExtraFee()
                ))
                .collect(Collectors.toList());
        return toDetailResponse(quote, responses);
    }

    @Transactional
    public void deleteQuote(Long quoteId) {
        Long shipperId = getCurrentShipperId();
        Quote quote = getOwnedQuote(quoteId, shipperId);
        quoteChecklistItemRepository.deleteByQuoteId(quoteId);
        quoteRepository.delete(quote);
    }

    private int calculateExtraPrice(List<QuoteChecklistItemRequest> items) {
        if (items == null || items.isEmpty()) {
            return 0;
        }
        BigDecimal sum = BigDecimal.ZERO;
        for (QuoteChecklistItemRequest item : items) {
            if (item.getExtraFee() != null) {
                sum = sum.add(item.getExtraFee());
            }
        }
        return sum.intValue();
    }

    private int safeInt(Integer value) {
        return value == null ? 0 : value;
    }

    private Quote getOwnedQuote(Long quoteId, Long shipperId) {
        Quote quote = quoteRepository.findById(quoteId)
                .orElseThrow(() -> new CustomException(ErrorCode.INVALID_REQUEST));
        if (!shipperId.equals(quote.getShipperId())) {
            throw new CustomException(ErrorCode.AUTH_FORBIDDEN);
        }
        return quote;
    }

    private QuoteListResponse toListResponse(Quote quote) {
        return new QuoteListResponse(
                quote.getQuoteId(),
                quote.getTruckId(),
                quote.getOriginAddress(),
                quote.getDestinationAddress(),
                quote.getDistanceKm(),
                quote.getDesiredPrice(),
                quote.getFinalPrice(),
                quote.getStatus(),
                quote.getCreatedAt()
        );
    }

    private QuoteChecklistItemResponse toItemResponse(QuoteChecklistItem item) {
        return new QuoteChecklistItemResponse(
                item.getChecklistItemId(),
                item.getExtraInput(),
                item.getExtraFee()
        );
    }

    private QuoteDetailResponse toDetailResponse(
            Quote quote,
            List<QuoteChecklistItemResponse> items
    ) {
        List<QuoteChecklistItemResponse> safeItems =
                items == null ? Collections.emptyList() : items;
        return new QuoteDetailResponse(
                quote.getQuoteId(),
                quote.getShipperId(),
                quote.getTruckId(),
                quote.getOriginAddress(),
                quote.getDestinationAddress(),
                quote.getOriginLat(),
                quote.getOriginLng(),
                quote.getDestinationLat(),
                quote.getDestinationLng(),
                quote.getDistanceKm(),
                quote.getWeightKg(),
                quote.getVolumeCbm(),
                quote.getCargoType(),
                quote.getCargoDesc(),
                quote.getBasePrice(),
                quote.getDistancePrice(),
                quote.getExtraPrice(),
                quote.getDesiredPrice(),
                quote.getFinalPrice(),
                quote.getAllowCombine(),
                quote.getLoadMethod(),
                quote.getUnloadMethod(),
                quote.getStatus(),
                quote.getCreatedAt(),
                quote.getUpdatedAt(),
                safeItems
        );
    }

    private Long getCurrentShipperId() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.isAuthenticated()) {
            throw new CustomException(ErrorCode.AUTH_UNAUTHORIZED);
        }
        boolean isShipper = authentication.getAuthorities().stream()
                .map(GrantedAuthority::getAuthority)
                .anyMatch("ROLE_SHIPPER"::equals);
        if (!isShipper) {
            throw new CustomException(ErrorCode.AUTH_FORBIDDEN);
        }
        String principal = String.valueOf(authentication.getPrincipal());
        return Long.valueOf(principal);
    }
}
