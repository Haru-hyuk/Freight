package com.freight.backend.service;

import com.freight.backend.dto.admin.AdminPricingVehicleUpdateRequest;
import com.freight.backend.entity.Match;
import com.freight.backend.entity.Payment;
import com.freight.backend.pricing.PricingRateCatalog;
import com.freight.backend.entity.Quote;
import com.freight.backend.entity.Settlement;
import com.freight.backend.entity.Shipper;
import com.freight.backend.exception.CustomException;
import com.freight.backend.exception.ErrorCode;
import com.freight.backend.repository.MatchRepository;
import com.freight.backend.repository.PaymentRepository;
import com.freight.backend.pricing.PricingRateCatalogRepository;
import com.freight.backend.repository.QuoteRepository;
import com.freight.backend.repository.SettlementRepository;
import com.freight.backend.repository.ShipperRepository;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class AdminTransportService {
    private static final int MAX_LIST_ROWS = 500;

    private final QuoteRepository quoteRepository;
    private final MatchRepository matchRepository;
    private final PaymentRepository paymentRepository;
    private final SettlementRepository settlementRepository;
    private final ShipperRepository shipperRepository;
    private final PricingRateCatalogRepository pricingRateCatalogRepository;

    @Transactional(readOnly = true)
    public List<Map<String, Object>> listQuotes() {
        List<Quote> quotes = quoteRepository.findAll(
                PageRequest.of(0, MAX_LIST_ROWS, Sort.by(Sort.Direction.DESC, "createdAt"))
        ).getContent();

        List<Long> shipperIds = quotes.stream()
                .map(Quote::getShipperId)
                .filter(id -> id != null && id > 0)
                .distinct()
                .toList();
        Map<Long, String> shipperNameById = shipperRepository.findAllById(shipperIds).stream()
                .collect(java.util.stream.Collectors.toMap(
                        Shipper::getShipperId,
                        shipper -> shipper.getName() == null || shipper.getName().isBlank() ? "화주" : shipper.getName(),
                        (left, right) -> left
                ));

        return quotes.stream()
                .map(quote -> toQuoteRow(quote, shipperNameById))
                .toList();
    }

    @Transactional(readOnly = true)
    public Map<String, Object> getQuote(Long quoteId) {
        Quote quote = quoteRepository.findById(quoteId)
                .orElseThrow(() -> new CustomException(ErrorCode.INVALID_REQUEST));
        return toQuoteDetail(quote);
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> listMatches() {
        return matchRepository.findAll(
                        PageRequest.of(0, MAX_LIST_ROWS, Sort.by(Sort.Direction.DESC, "createdAt"))
                ).getContent().stream()
                .map(this::toMatchRow)
                .toList();
    }

    @Transactional(readOnly = true)
    public Map<String, Object> getMatch(Long matchId) {
        Match match = matchRepository.findById(matchId)
                .orElseThrow(() -> new CustomException(ErrorCode.INVALID_REQUEST));
        return toMatchDetail(match);
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> listPayments() {
        return paymentRepository.findAll(
                        PageRequest.of(0, MAX_LIST_ROWS, Sort.by(Sort.Direction.DESC, "createdAt"))
                ).getContent().stream()
                .map(this::toPaymentRow)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> listSettlements() {
        return settlementRepository.findAll(
                        PageRequest.of(0, MAX_LIST_ROWS, Sort.by(Sort.Direction.DESC, "createdAt"))
                ).getContent().stream()
                .map(this::toSettlementRow)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> listPricingRates() {
        return pricingRateCatalogRepository.findAllByOrderByVehicleTypeAscMinDistanceKmAsc(
                        PageRequest.of(0, MAX_LIST_ROWS)
                ).stream()
                .map(this::toPricingRateRow)
                .toList();
    }

    @Transactional
    public Map<String, Object> updatePricingRate(String rateId, AdminPricingVehicleUpdateRequest request) {
        Long numericId = parseFlexibleId(rateId);
        PricingRateCatalog row = pricingRateCatalogRepository.findById(numericId)
                .orElseThrow(() -> new CustomException(ErrorCode.INVALID_REQUEST));
        row.updateByAdmin(
                request == null ? null : request.getBaseFare(),
                request == null ? null : request.getAdditionalFare(),
                request == null || request.getSurchargeRate() == null
                        ? null
                        : BigDecimal.valueOf(request.getSurchargeRate()),
                request == null ? null : request.getActive(),
                "admin"
        );
        pricingRateCatalogRepository.save(row);
        return toPricingRateRow(row);
    }

    private Map<String, Object> toQuoteRow(Quote q, Map<Long, String> shipperNameById) {
        Map<String, Object> row = new LinkedHashMap<>();
        row.put("quote_id", q.getQuoteId());
        row.put("shipper_id", q.getShipperId());
        row.put("shipper_name", shipperNameById.getOrDefault(q.getShipperId(), "화주"));
        row.put("status", q.getStatus());
        row.put("origin_address", q.getOriginAddress());
        row.put("destination_address", q.getDestinationAddress());
        row.put("cargo_name", q.getCargoName());
        row.put("cargo_type", q.getCargoType());
        row.put("distance_km", q.getDistanceKm());
        row.put("weight_kg", q.getWeightKg());
        row.put("volume_cbm", q.getVolumeCbm());
        row.put("desired_price", q.getDesiredPrice());
        row.put("final_price", q.getFinalPrice());
        row.put("allow_combine", q.getAllowCombine());
        row.put("load_method", q.getLoadMethod());
        row.put("unload_method", q.getUnloadMethod());
        row.put("delivery_schedule", q.getDeliverySchedule() == null ? null : q.getDeliverySchedule().toString());
        row.put("cargo_desc", q.getCargoDesc());
        row.put("created_at", q.getCreatedAt() == null ? null : q.getCreatedAt().toString());
        row.put("updated_at", q.getUpdatedAt() == null ? null : q.getUpdatedAt().toString());
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

    private Map<String, Object> toPricingRateRow(PricingRateCatalog row) {
        Map<String, Object> mapped = new LinkedHashMap<>();
        mapped.put("vehiclePricingId", row.getRateId() == null ? "" : String.valueOf(row.getRateId()));
        mapped.put("rateId", row.getRateId() == null ? "" : String.valueOf(row.getRateId()));
        mapped.put("vehicleType", defaultText(row.getVehicleType(), ""));
        mapped.put("tonnageLabel", mapVehicleTypeToTonnage(row.getVehicleType()));
        mapped.put("bodyType", mapVehicleTypeToBodyType(row.getVehicleType()));
        mapped.put("rangeKey", defaultText(row.getRangeKey(), ""));
        mapped.put("minDistanceKm", row.getMinDistanceKm() == null ? 0 : row.getMinDistanceKm());
        mapped.put("maxDistanceKm", row.getMaxDistanceKm() == null ? 0 : row.getMaxDistanceKm());
        mapped.put("rangeLabel", formatRangeLabel(row.getMinDistanceKm(), row.getMaxDistanceKm()));
        mapped.put("baseFare", row.getBaseRateWon() == null ? 0 : row.getBaseRateWon());
        mapped.put("additionalFare", row.getAdditionalFareWon() == null ? 0 : row.getAdditionalFareWon());
        mapped.put("surchargeRate", row.getSurchargeRate() == null ? 0.0 : row.getSurchargeRate().doubleValue());
        mapped.put("active", !Boolean.FALSE.equals(row.getActive()));
        mapped.put("updatedBy", defaultText(row.getUpdatedBy(), defaultText(row.getSourceName(), "system")));
        mapped.put("updatedAt", toText(row.getUpdatedAt()));
        return mapped;
    }

    private static String formatRangeLabel(Integer minKm, Integer maxKm) {
        if (minKm == null && maxKm == null) return "-";
        int min = minKm == null ? 0 : minKm;
        int max = maxKm == null ? 0 : maxKm;
        if (min <= 0 && max <= 0) return "-";
        return min + "~" + max + "km";
    }

    private static Long parseFlexibleId(String raw) {
        if (raw == null || raw.isBlank()) throw new CustomException(ErrorCode.INVALID_REQUEST);
        String digits = raw.replaceAll("[^0-9]", "");
        if (digits.isBlank()) throw new CustomException(ErrorCode.INVALID_REQUEST);
        try {
            return Long.parseLong(digits);
        } catch (NumberFormatException ex) {
            throw new CustomException(ErrorCode.INVALID_REQUEST);
        }
    }

    private static String defaultText(String value, String fallback) {
        if (value == null || value.isBlank()) return fallback;
        return value.trim();
    }

    private static String toText(LocalDateTime value) {
        return value == null ? null : value.toString();
    }

    private static String mapVehicleTypeToTonnage(String vehicleType) {
        String type = vehicleType == null ? "" : vehicleType.trim().toUpperCase(Locale.ROOT);
        if (type.isBlank()) return "기타";
        String normalized = type.replace('-', '_').replace(' ', '_');
        if ("DAMAS".equals(normalized)) return "다마스";
        if ("LABO".equals(normalized)) return "라보";
        if (containsAny(normalized, "TON_25", "TON25")) return "25톤";
        if (containsAny(normalized, "TON_18", "TON18")) return "18톤";
        if (containsAny(normalized, "TON_15", "TON15")) return "15톤";
        if (containsAny(normalized, "TON_14", "TON14")) return "14톤";
        if (containsAny(normalized, "TON_11", "TON11")) return "11톤";
        if (containsAny(normalized, "TON_8", "TON8")) return "8톤";
        if (containsAny(normalized, "TON_5_AXLE", "TON5AXLE", "5_AXLE", "5AXLE")) return "5축";
        if (containsAny(normalized, "TON_2_5", "TON2_5", "TON2.5", "2_5", "2.5")) return "2.5톤";
        if (containsAny(normalized, "TON_3_5", "TON3_5", "TON3.5", "3_5", "3.5")) return "3.5톤";
        if (containsAny(normalized, "TON_5", "TON5")) return "5톤";
        if (containsAny(normalized, "TON_1_4", "TON1_4", "TON1.4", "1_4", "1.4")) return "1.4톤";
        if (containsAny(normalized, "TON_1", "TON1")) return "1톤";
        return vehicleType;
    }

    private static String mapVehicleTypeToBodyType(String vehicleType) {
        String type = vehicleType == null ? "" : vehicleType.trim().toUpperCase(Locale.ROOT);
        if (type.contains("REFRIGERATED") || type.contains("냉장")) return "냉장차";
        if (type.contains("WING")) return "윙바디";
        if (type.contains("TOP")) return "탑차";
        if (type.contains("TRACTOR") || type.contains("TRAILER")) return "추레라";
        if (type.contains("LADDER")) return "사다리차";
        return "일반카고";
    }

    private static boolean containsAny(String source, String... candidates) {
        if (source == null || source.isBlank() || candidates == null) return false;
        for (String candidate : candidates) {
            if (candidate != null && !candidate.isBlank() && source.contains(candidate)) {
                return true;
            }
        }
        return false;
    }
}
