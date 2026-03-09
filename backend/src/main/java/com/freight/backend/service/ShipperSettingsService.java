package com.freight.backend.service;

import com.freight.backend.dto.shipper.ShipperPaymentMethodSummaryResponse;
import com.freight.backend.entity.Match;
import com.freight.backend.entity.Payment;
import com.freight.backend.entity.Quote;
import com.freight.backend.entity.Shipper;
import com.freight.backend.repository.MatchRepository;
import com.freight.backend.repository.PaymentRepository;
import com.freight.backend.repository.QuoteRepository;
import com.freight.backend.repository.ShipperRepository;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class ShipperSettingsService {

    private static final DateTimeFormatter ISO_FORMATTER = DateTimeFormatter.ISO_LOCAL_DATE_TIME;

    private final QuoteRepository quoteRepository;
    private final MatchRepository matchRepository;
    private final PaymentRepository paymentRepository;
    private final ShipperRepository shipperRepository;

    @Transactional(readOnly = true)
    public List<ShipperPaymentMethodSummaryResponse> listPaymentMethods(Long shipperId) {
        List<Long> quoteIds = quoteRepository.findByShipperId(shipperId).stream()
                .map(Quote::getQuoteId)
                .filter(Objects::nonNull)
                .toList();
        if (quoteIds.isEmpty()) {
            return List.of();
        }

        List<Long> matchIds = matchRepository.findByQuoteIdIn(quoteIds).stream()
                .map(Match::getMatchId)
                .filter(Objects::nonNull)
                .toList();
        if (matchIds.isEmpty()) {
            return List.of();
        }

        List<Payment> payments = paymentRepository.findByMatchIdInOrderByCreatedAtDesc(matchIds).stream()
                .filter(payment -> payment.getMethod() != null)
                .toList();
        if (payments.isEmpty()) {
            return List.of();
        }

        String holderName = shipperRepository.findById(shipperId)
                .map(this::resolveHolderName)
                .orElse("화주");

        Map<Payment.PaymentMethod, MethodAggregate> aggregateByMethod = new LinkedHashMap<>();
        for (Payment payment : payments) {
            Payment.PaymentMethod method = payment.getMethod();
            MethodAggregate aggregate = aggregateByMethod.computeIfAbsent(method, ignored -> new MethodAggregate());
            LocalDateTime occurredAt = resolvePaymentTime(payment);
            aggregate.usageCount += 1L;
            if (aggregate.firstSeen == null || occurredAt.isBefore(aggregate.firstSeen)) {
                aggregate.firstSeen = occurredAt;
            }
            if (aggregate.lastUsed == null || occurredAt.isAfter(aggregate.lastUsed)) {
                aggregate.lastUsed = occurredAt;
            }
            String last4 = extractLast4(payment.getPgRef(), payment.getOrderNo(), payment.getAttemptId());
            if (!last4.equals("----")) {
                aggregate.last4 = last4;
            }
        }

        Payment.PaymentMethod defaultMethod = aggregateByMethod.entrySet().stream()
                .max(Comparator.comparing(entry -> entry.getValue().lastUsed))
                .map(Map.Entry::getKey)
                .orElse(null);

        List<ShipperPaymentMethodSummaryResponse> out = new ArrayList<>();
        for (Map.Entry<Payment.PaymentMethod, MethodAggregate> entry : aggregateByMethod.entrySet()) {
            Payment.PaymentMethod method = entry.getKey();
            MethodAggregate aggregate = entry.getValue();
            out.add(ShipperPaymentMethodSummaryResponse.builder()
                    .id("PM-" + method.name())
                    .type(toClientType(method))
                    .provider(toProviderLabel(method))
                    .holderName(holderName)
                    .last4(aggregate.last4)
                    .registeredAt(toText(aggregate.firstSeen))
                    .lastUsedAt(toText(aggregate.lastUsed))
                    .usageCount(aggregate.usageCount)
                    .isDefault(method == defaultMethod)
                    .build());
        }

        return out.stream()
                .sorted((a, b) -> {
                    int defaultCompare = Boolean.compare(Boolean.TRUE.equals(b.getIsDefault()), Boolean.TRUE.equals(a.getIsDefault()));
                    if (defaultCompare != 0) return defaultCompare;
                    LocalDateTime aLast = parseTime(a.getLastUsedAt());
                    LocalDateTime bLast = parseTime(b.getLastUsedAt());
                    return bLast.compareTo(aLast);
                })
                .toList();
    }

    private String resolveHolderName(Shipper shipper) {
        String companyName = normalizeText(shipper.getCompanyName());
        if (!companyName.isBlank()) return companyName;
        String name = normalizeText(shipper.getName());
        return name.isBlank() ? "화주" : name;
    }

    private LocalDateTime resolvePaymentTime(Payment payment) {
        if (payment.getPaidAt() != null) return payment.getPaidAt();
        if (payment.getCreatedAt() != null) return payment.getCreatedAt();
        return LocalDateTime.MIN;
    }

    private String toClientType(Payment.PaymentMethod method) {
        return switch (method) {
            case CARD -> "CARD";
            case TRANSFER -> "BANK";
            case PREPAID -> "POSTPAID";
        };
    }

    private String toProviderLabel(Payment.PaymentMethod method) {
        return switch (method) {
            case CARD -> "카드 결제";
            case TRANSFER -> "계좌 이체";
            case PREPAID -> "선결제/예치금";
        };
    }

    private String normalizeText(String value) {
        return Optional.ofNullable(value).orElse("").trim();
    }

    private String extractLast4(String... values) {
        for (String value : values) {
            String source = normalizeText(value);
            if (source.isBlank()) continue;
            String digits = source.replaceAll("\\D", "");
            if (digits.length() < 4) continue;
            return digits.substring(digits.length() - 4);
        }
        return "----";
    }

    private String toText(LocalDateTime value) {
        if (value == null || value.equals(LocalDateTime.MIN)) return "";
        return value.format(ISO_FORMATTER);
    }

    private LocalDateTime parseTime(String value) {
        String raw = normalizeText(value);
        if (raw.isBlank()) return LocalDateTime.MIN;
        try {
            return LocalDateTime.parse(raw, ISO_FORMATTER);
        } catch (Exception ignored) {
            return LocalDateTime.MIN;
        }
    }

    private static final class MethodAggregate {
        private long usageCount = 0L;
        private LocalDateTime firstSeen;
        private LocalDateTime lastUsed;
        private String last4 = "----";
    }
}
