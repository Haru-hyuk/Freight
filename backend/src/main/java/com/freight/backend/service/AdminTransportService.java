package com.freight.backend.service;

import com.freight.backend.entity.Match;
import com.freight.backend.entity.Payment;
import com.freight.backend.entity.Quote;
import com.freight.backend.entity.Settlement;
import com.freight.backend.repository.MatchRepository;
import com.freight.backend.repository.PaymentRepository;
import com.freight.backend.repository.QuoteRepository;
import com.freight.backend.repository.SettlementRepository;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class AdminTransportService {

    private final QuoteRepository quoteRepository;
    private final MatchRepository matchRepository;
    private final PaymentRepository paymentRepository;
    private final SettlementRepository settlementRepository;

    @Transactional(readOnly = true)
    public List<Map<String, Object>> listQuotes() {
        return quoteRepository.findAll().stream()
                .sorted(Comparator.comparing(Quote::getCreatedAt, Comparator.nullsLast(Comparator.reverseOrder())))
                .map(this::toQuoteRow)
                .toList();
    }

    @Transactional(readOnly = true)
    public Map<String, Object> getQuote(Long quoteId) {
        Quote quote = quoteRepository.findById(quoteId).orElseThrow();
        return toQuoteDetail(quote);
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> listMatches() {
        return matchRepository.findAll().stream()
                .sorted(Comparator.comparing(Match::getCreatedAt, Comparator.nullsLast(Comparator.reverseOrder())))
                .map(this::toMatchRow)
                .toList();
    }

    @Transactional(readOnly = true)
    public Map<String, Object> getMatch(Long matchId) {
        Match match = matchRepository.findById(matchId).orElseThrow();
        return toMatchDetail(match);
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> listPayments() {
        return paymentRepository.findAll().stream()
                .sorted(Comparator.comparing(Payment::getCreatedAt, Comparator.nullsLast(Comparator.reverseOrder())))
                .map(this::toPaymentRow)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> listSettlements() {
        return settlementRepository.findAll().stream()
                .sorted(Comparator.comparing(Settlement::getCreatedAt, Comparator.nullsLast(Comparator.reverseOrder())))
                .map(this::toSettlementRow)
                .toList();
    }

    private Map<String, Object> toQuoteRow(Quote q) {
        Map<String, Object> row = new LinkedHashMap<>();
        row.put("quote_id", q.getQuoteId());
        row.put("status", q.getStatus());
        row.put("origin_address", q.getOriginAddress());
        row.put("destination_address", q.getDestinationAddress());
        row.put("cargo_name", q.getCargoName());
        row.put("final_price", q.getFinalPrice());
        row.put("created_at", q.getCreatedAt() == null ? null : q.getCreatedAt().toString());
        return row;
    }

    private Map<String, Object> toQuoteDetail(Quote q) {
        Map<String, Object> row = new LinkedHashMap<>();
        row.put("quote_id", q.getQuoteId());
        row.put("shipper_id", q.getShipperId());
        row.put("status", q.getStatus());
        row.put("origin_address", q.getOriginAddress());
        row.put("destination_address", q.getDestinationAddress());
        row.put("cargo_name", q.getCargoName());
        row.put("cargo_type", q.getCargoType());
        row.put("weight_kg", q.getWeightKg());
        row.put("volume_cbm", q.getVolumeCbm());
        row.put("distance_km", q.getDistanceKm());
        row.put("final_price", q.getFinalPrice());
        row.put("created_at", q.getCreatedAt() == null ? null : q.getCreatedAt().toString());
        return row;
    }

    private Map<String, Object> toMatchRow(Match m) {
        Map<String, Object> row = new LinkedHashMap<>();
        row.put("match_id", m.getMatchId());
        row.put("quote_id", m.getQuoteId());
        row.put("driver_id", m.getDriverId());
        row.put("accepted", m.getAccepted());
        row.put("status", m.getStatus().name());
        row.put("updated_at", m.getUpdatedAt() == null ? null : m.getUpdatedAt().toString());
        return row;
    }

    private Map<String, Object> toMatchDetail(Match m) {
        Map<String, Object> row = new LinkedHashMap<>();
        row.put("match_id", m.getMatchId());
        row.put("quote_id", m.getQuoteId());
        row.put("driver_id", m.getDriverId());
        row.put("accepted", m.getAccepted());
        row.put("accepted_at", m.getAcceptedAt() == null ? null : m.getAcceptedAt().toString());
        row.put("status", m.getStatus().name());
        row.put("created_at", m.getCreatedAt() == null ? null : m.getCreatedAt().toString());
        row.put("updated_at", m.getUpdatedAt() == null ? null : m.getUpdatedAt().toString());
        return row;
    }

    private Map<String, Object> toPaymentRow(Payment p) {
        Map<String, Object> row = new LinkedHashMap<>();
        row.put("payment_id", p.getPaymentId());
        row.put("match_id", p.getMatchId());
        row.put("order_no", p.getOrderNo());
        row.put("status", p.getStatus() == null ? null : p.getStatus().name());
        row.put("method", p.getMethod() == null ? null : p.getMethod().name());
        row.put("total_amount", p.getTotalAmount());
        row.put("paid_at", p.getPaidAt() == null ? null : p.getPaidAt().toString());
        row.put("created_at", p.getCreatedAt() == null ? null : p.getCreatedAt().toString());
        return row;
    }

    private Map<String, Object> toSettlementRow(Settlement s) {
        Map<String, Object> row = new LinkedHashMap<>();
        row.put("settlement_id", s.getSettlementId());
        row.put("match_id", s.getMatchId());
        row.put("driver_id", s.getDriverId());
        row.put("shipper_id", s.getShipperId());
        row.put("total_fare", s.getTotalFare());
        row.put("platform_fee", s.getPlatformFee());
        row.put("fast_fee", s.getFastFee());
        row.put("driver_payout", s.getDriverPayout());
        row.put("shipper_payment_status", s.getShipperPaymentStatus() == null ? null : s.getShipperPaymentStatus().name());
        row.put("shipper_payment_method", s.getShipperPaymentMethod() == null ? null : s.getShipperPaymentMethod().name());
        row.put("shipper_paid_at", s.getShipperPaidAt() == null ? null : s.getShipperPaidAt().toString());
        row.put("settlement_type", s.getSettlementType() == null ? null : s.getSettlementType().name());
        row.put("settlement_status", s.getSettlementStatus() == null ? null : s.getSettlementStatus().name());
        row.put("due_date", s.getDueDate() == null ? null : s.getDueDate().toString());
        row.put("completed_at", s.getCompletedAt() == null ? null : s.getCompletedAt().toString());
        row.put("created_at", s.getCreatedAt() == null ? null : s.getCreatedAt().toString());
        return row;
    }
}
