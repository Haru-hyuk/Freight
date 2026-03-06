package com.freight.backend.service;

import com.freight.backend.ai.DeepSeekClient;
import com.freight.backend.dto.quote.DriverQuoteSummaryResponse;
import com.freight.backend.dto.quote.QuoteChecklistItemRequest;
import com.freight.backend.dto.quote.QuoteChecklistItemResponse;
import com.freight.backend.dto.quote.QuoteCreateRequest;
import com.freight.backend.dto.quote.QuoteCreateResponse;
import com.freight.backend.dto.quote.QuoteDetailResponse;
import com.freight.backend.dto.quote.QuoteEtaSuggestionRequest;
import com.freight.backend.dto.quote.QuoteEtaSuggestionResponse;
import com.freight.backend.dto.quote.QuoteItemRequest;
import com.freight.backend.dto.quote.QuoteItemResponse;
import com.freight.backend.dto.quote.QuoteListResponse;
import com.freight.backend.dto.quote.QuoteStopRequest;
import com.freight.backend.dto.quote.QuoteStopResponse;
import com.freight.backend.dto.quote.QuoteUpdateRequest;
import com.freight.backend.dto.quote.QuoteValidationResponse;
import com.freight.backend.entity.ChecklistItem;
import com.freight.backend.entity.Match;
import com.freight.backend.entity.Quote;
import com.freight.backend.entity.QuoteChecklistItem;
import com.freight.backend.entity.QuoteItem;
import com.freight.backend.entity.QuoteStop;
import com.freight.backend.exception.CustomException;
import com.freight.backend.exception.ErrorCode;
import com.freight.backend.geocoding.GeocodingResult;
import com.freight.backend.geocoding.GeocodingService;
import com.freight.backend.pricing.LoadHandlingMethod;
import com.freight.backend.pricing.PricingCalculator;
import com.freight.backend.pricing.PricingResult;
import com.freight.backend.pricing.PricingVehicleType;
import com.freight.backend.pricing.SurchargeOptionRule;
import com.freight.backend.pricing.SurchargeOptionService;
import com.freight.backend.repository.CounterOfferRepository;
import com.freight.backend.repository.DeliveryPhotoRepository;
import com.freight.backend.repository.ChecklistItemRepository;
import com.freight.backend.repository.MatchRepository;
import com.freight.backend.repository.NotificationRepository;
import com.freight.backend.repository.PaymentRepository;
import com.freight.backend.repository.QuoteChecklistItemRepository;
import com.freight.backend.repository.QuoteItemRepository;
import com.freight.backend.repository.QuoteRepository;
import com.freight.backend.repository.QuoteStopRepository;
import com.freight.backend.repository.SettlementRepository;
import com.freight.backend.routing.RouteDistanceService;
import com.freight.backend.routing.RoutePoint;
import com.freight.backend.util.StopOrderUtils;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.dao.IncorrectResultSizeDataAccessException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * 견적 서비스
 * - 견적 생성/수정/삭제
 * - 운임 계산 (거리/차종/옵션)
 * - AI 기반 견적 진단
 */
@Service
@Slf4j
@RequiredArgsConstructor
public class QuoteService {
    private static final UUID ZERO_UUID = new UUID(0L, 0L);

    private final QuoteRepository quoteRepository;
    private final ChecklistItemRepository checklistItemRepository;
    private final QuoteChecklistItemRepository quoteChecklistItemRepository;
    private final QuoteItemRepository quoteItemRepository;
    private final QuoteStopRepository quoteStopRepository;
    private final MatchRepository matchRepository;
    private final NotificationRepository notificationRepository;
    private final CounterOfferRepository counterOfferRepository;
    private final PaymentRepository paymentRepository;
    private final SettlementRepository settlementRepository;
    private final DeliveryPhotoRepository deliveryPhotoRepository;
    private final PricingCalculator pricingCalculator;
    private final SurchargeOptionService surchargeOptionService;
    private final DeepSeekClient deepSeekClient;
    private final GeocodingService geocodingService;
    private final RouteDistanceService routeDistanceService;
    private final MatchService matchService;
    @Value("${quote.eta.avg-speed-kmh:50}")
    private int etaAverageSpeedKmh;
    @Value("${quote.eta.base-buffer-seconds:1200}")
    private int etaBaseBufferSeconds;
    @Value("${quote.eta.per-stop-buffer-seconds:300}")
    private int etaPerStopBufferSeconds;
    @Value("${quote.eta.max-buffer-seconds:1800}")
    private int etaMaxBufferSeconds;

    @Transactional
    public QuoteCreateResponse createQuote(QuoteCreateRequest req) {
        Long shipperId = getCurrentShipperId();
        boolean allowCombine = Boolean.TRUE.equals(req.getAllowCombine());
        NormalizedSchedule schedule = normalizeScheduleFields(
                allowCombine,
                req.getPickupScheduleStart(),
                req.getDeliveryDeadline(),
                req.getDeliverySchedule()
        );
        ResolvedPoint originPoint = resolvePoint(
                req.getOriginAddress(),
                req.getOriginLat(),
                req.getOriginLng(),
                ErrorCode.ORIGIN_GEOCODE_FAILED
        );
        ResolvedPoint destinationPoint = resolvePoint(
                req.getDestinationAddress(),
                req.getDestinationLat(),
                req.getDestinationLng(),
                ErrorCode.DESTINATION_GEOCODE_FAILED
        );
        List<ResolvedStop> resolvedStops = resolveStops(req.getStops());
        int resolvedDistanceKm = calculateDistanceKm(originPoint, destinationPoint, resolvedStops);

        PricingResult pricing = calculatePricing(
                resolvedDistanceKm,
                req.getVehicleType(),
                req.getVehicleBodyType(),
                req.getLoadMethod(),
                req.getUnloadMethod(),
                allowCombine
        );
        int basePrice = pricing.rateWon().setScale(0, RoundingMode.HALF_UP).intValue();
        int weighted = pricing.weightedWon().setScale(0, RoundingMode.HALF_UP).intValue();
        int extraPrice = Math.max(0, weighted - basePrice);
        int finalPrice = pricing.finalChargeAfterDiscountWon()
                .setScale(0, RoundingMode.HALF_UP)
                .intValue();
        int desiredPrice = req.getDesiredPrice() != null ? req.getDesiredPrice() : finalPrice;

        Quote quote = Quote.builder()
                .shipperId(shipperId)
                .truckId(req.getTruckId())
                .originAddress(originPoint.address())
                .originAddressDetail(normalizeText(req.getOriginAddressDetail()))
                .destinationAddress(destinationPoint.address())
                .destinationAddressDetail(normalizeText(req.getDestinationAddressDetail()))
                .senderName(normalizeText(req.getSenderName()))
                .senderPhone(normalizeText(req.getSenderPhone()))
                .receiverName(normalizeText(req.getReceiverName()))
                .receiverPhone(normalizeText(req.getReceiverPhone()))
                .originLat(originPoint.lat())
                .originLng(originPoint.lng())
                .destinationLat(destinationPoint.lat())
                .destinationLng(destinationPoint.lng())
                .distanceKm(resolvedDistanceKm)
                .weightKg(req.getWeightKg())
                .volumeCbm(req.getVolumeCbm())
                .vehicleType(req.getVehicleType())
                .vehicleBodyType(req.getVehicleBodyType())
                .cargoName(req.getCargoName())
                .cargoType(req.getCargoType())
                .cargoDesc(req.getCargoDesc())
                .basePrice(basePrice)
                .distancePrice(0)
                .extraPrice(extraPrice)
                .desiredPrice(desiredPrice)
                .finalPrice(finalPrice)
                .allowCombine(allowCombine)
                .loadMethod(req.getLoadMethod())
                .unloadMethod(req.getUnloadMethod())
                .pickupScheduleStart(schedule.pickupScheduleStart())
                .deliveryDeadline(schedule.deliveryDeadline())
                .deliverySchedule(schedule.deliveryDeadline())
                .status("OPEN")
                .build();

        Quote saved = quoteRepository.save(quote);

        saveChecklistItems(saved.getQuoteId(), req.getChecklistItems());
        saveQuoteItems(saved.getQuoteId(), req.getQuoteItems());
        saveStops(saved.getQuoteId(), resolvedStops);
        matchService.ensureOpenMatchForQuote(saved.getQuoteId());

        List<QuoteStopResponse> responseStops = resolvedStops.stream()
                .map(stop -> new QuoteStopResponse(
                        null,
                        stop.seq(),
                        stop.address(),
                        stop.lat(),
                        stop.lng(),
                        stop.contactName(),
                        stop.contactPhone(),
                        stop.deptName(),
                        stop.managerName()
                ))
                .collect(Collectors.toList());

        return new QuoteCreateResponse(
                saved.getQuoteId(),
                saved.getPublicId(),
                saved.getOriginLat(),
                saved.getOriginLng(),
                saved.getDestinationLat(),
                saved.getDestinationLng(),
                responseStops
        );
    }

    @Transactional(readOnly = true)
    public QuoteEtaSuggestionResponse suggestEta(QuoteEtaSuggestionRequest req) {
        if (req == null || req.getPickupScheduleStart() == null) {
            throw new CustomException(ErrorCode.INVALID_REQUEST);
        }

        ResolvedPoint originPoint = resolvePoint(
                req.getOriginAddress(),
                req.getOriginLat(),
                req.getOriginLng(),
                ErrorCode.ORIGIN_GEOCODE_FAILED
        );
        ResolvedPoint destinationPoint = resolvePoint(
                req.getDestinationAddress(),
                req.getDestinationLat(),
                req.getDestinationLng(),
                ErrorCode.DESTINATION_GEOCODE_FAILED
        );
        List<ResolvedStop> resolvedStops = resolveStops(req.getStops());
        List<RoutePoint> points = buildRoutePoints(originPoint, destinationPoint, resolvedStops);

        int distanceKm;
        Integer routeDurationSeconds;
        try {
            RouteDistanceService.RouteMetrics routeMetrics = routeDistanceService.calculateRouteMetrics(points);
            distanceKm = normalizeDistanceKm(routeMetrics.distanceKm());
            routeDurationSeconds = routeMetrics.durationSeconds();
        } catch (RuntimeException e) {
            log.warn("ETA suggestion distance calculation failed. pointsCount={}, cause='{}'", points.size(), e.getMessage());
            throw new CustomException(ErrorCode.ROUTE_DISTANCE_FAILED);
        }

        int estimatedTravelSeconds = resolveEstimatedTravelSeconds(routeDurationSeconds, distanceKm);
        int handlingBufferSeconds = resolveHandlingBufferSeconds(resolvedStops.size());
        LocalDateTime pickupScheduleStart = req.getPickupScheduleStart().withSecond(0).withNano(0);
        LocalDateTime proposedDeliveryDeadline = pickupScheduleStart
                .plusSeconds(estimatedTravelSeconds)
                .plusSeconds(handlingBufferSeconds)
                .withSecond(0)
                .withNano(0);

        return new QuoteEtaSuggestionResponse(
                pickupScheduleStart,
                distanceKm,
                estimatedTravelSeconds,
                handlingBufferSeconds,
                proposedDeliveryDeadline
        );
    }



    @Transactional
    public DriverQuoteSummaryResponse getDriverQuoteSummary(Long quoteId) {
        Quote quote = quoteRepository.findById(quoteId)
                .orElseThrow(() -> new CustomException(ErrorCode.INVALID_REQUEST));
        quote = healMissingCoordinatesIfPossible(quote);

        int itemCount = normalizeItemCount(quoteItemRepository.sumEffectiveQuantityByQuoteId(quoteId));
        List<QuoteItemResponse> quoteItems = quoteItemRepository.findByQuoteId(quoteId).stream()
                .map(this::toQuoteItemResponse)
                .collect(Collectors.toList());
        List<QuoteStopResponse> stops = quoteStopRepository.findByQuoteIdOrderBySeqAsc(quoteId).stream()
                .map(this::toStopResponse)
                .collect(Collectors.toList());
        return toDriverQuoteSummaryResponse(quote, itemCount, quoteItems, stops);
    }

    @Transactional
    public List<DriverQuoteSummaryResponse> getDriverQuoteSummaries(List<Long> quoteIds) {
        if (quoteIds == null || quoteIds.isEmpty()) {
            return List.of();
        }

        List<Long> orderedQuoteIds = quoteIds.stream()
                .filter(id -> id != null && id > 0)
                .distinct()
                .collect(Collectors.toList());
        if (orderedQuoteIds.isEmpty()) {
            return List.of();
        }

        Map<Long, Quote> quoteById = quoteRepository.findAllById(orderedQuoteIds).stream()
                .map(this::healMissingCoordinatesIfPossible)
                .collect(Collectors.toMap(Quote::getQuoteId, quote -> quote, (a, b) -> a, LinkedHashMap::new));

        Map<Long, Integer> itemCountByQuoteId = new LinkedHashMap<>();
        quoteItemRepository.sumEffectiveQuantityByQuoteIdIn(orderedQuoteIds).forEach(row -> {
            Long key = row.getQuoteId();
            if (key == null || key <= 0) return;
            itemCountByQuoteId.put(key, normalizeItemCount(row.getTotalQuantity()));
        });
        Map<Long, List<QuoteItemResponse>> quoteItemsByQuoteId = buildQuoteItemsByQuoteId(orderedQuoteIds);
        Map<Long, List<QuoteStopResponse>> stopsByQuoteId = buildStopsByQuoteId(orderedQuoteIds);

        List<DriverQuoteSummaryResponse> responses = new ArrayList<>(orderedQuoteIds.size());
        for (Long quoteId : orderedQuoteIds) {
            Quote quote = quoteById.get(quoteId);
            if (quote == null) {
                continue;
            }
            int itemCount = itemCountByQuoteId.getOrDefault(quoteId, 1);
            List<QuoteItemResponse> quoteItems = quoteItemsByQuoteId.getOrDefault(quoteId, List.of());
            List<QuoteStopResponse> stops = stopsByQuoteId.getOrDefault(quoteId, List.of());
            responses.add(toDriverQuoteSummaryResponse(quote, itemCount, quoteItems, stops));
        }
        return responses;
    }

    private int normalizeItemCount(Long totalQuantity) {
        if (totalQuantity == null || totalQuantity <= 0) {
            return 1;
        }
        if (totalQuantity > Integer.MAX_VALUE) {
            return Integer.MAX_VALUE;
        }
        return totalQuantity.intValue();
    }

    private Map<Long, List<QuoteItemResponse>> buildQuoteItemsByQuoteId(List<Long> quoteIds) {
        Map<Long, List<QuoteItemResponse>> byQuoteId = new LinkedHashMap<>();
        for (Long quoteId : quoteIds) {
            if (quoteId == null || quoteId <= 0) continue;
            byQuoteId.put(quoteId, new ArrayList<>());
        }
        quoteItemRepository.findByQuoteIdIn(quoteIds).forEach(item -> {
            Long quoteId = item.getQuoteId();
            if (quoteId == null || !byQuoteId.containsKey(quoteId)) return;
            byQuoteId.get(quoteId).add(toQuoteItemResponse(item));
        });
        byQuoteId.values().forEach(list ->
                list.sort((a, b) -> Integer.compare(
                        a.getSortOrder() == null ? Integer.MAX_VALUE : a.getSortOrder(),
                        b.getSortOrder() == null ? Integer.MAX_VALUE : b.getSortOrder()
                )));
        return byQuoteId;
    }

    private Map<Long, List<QuoteStopResponse>> buildStopsByQuoteId(List<Long> quoteIds) {
        Map<Long, List<QuoteStopResponse>> byQuoteId = new LinkedHashMap<>();
        for (Long quoteId : quoteIds) {
            if (quoteId == null || quoteId <= 0) continue;
            byQuoteId.put(quoteId, new ArrayList<>());
        }
        quoteStopRepository.findByQuoteIdInOrderByQuoteIdAscSeqAsc(quoteIds).forEach(stop -> {
            Long quoteId = stop.getQuoteId();
            if (quoteId == null || !byQuoteId.containsKey(quoteId)) return;
            byQuoteId.get(quoteId).add(toStopResponse(stop));
        });
        return byQuoteId;
    }

    private DriverQuoteSummaryResponse toDriverQuoteSummaryResponse(
            Quote quote,
            int itemCount,
            List<QuoteItemResponse> quoteItems,
            List<QuoteStopResponse> stops
    ) {
        String originAddress = sanitizeDisplayText(quote.getOriginAddress());
        String destinationAddress = sanitizeDisplayText(quote.getDestinationAddress());
        String cargoName = sanitizeCargoDisplayText(quote.getCargoName());
        String cargoType = sanitizeDisplayText(quote.getCargoType());
        String cargoDesc = sanitizeDisplayText(quote.getCargoDesc());
        return new DriverQuoteSummaryResponse(
                quote.getQuoteId(),
                originAddress,
                destinationAddress,
                quote.getOriginLat(),
                quote.getOriginLng(),
                quote.getDestinationLat(),
                quote.getDestinationLng(),
                cargoName,
                cargoType,
                cargoDesc,
                quote.getFinalPrice(),
                quote.getDistanceKm(),
                quote.getWeightKg(),
                quote.getVolumeCbm(),
                itemCount,
                quote.getAllowCombine(),
                quote.getVehicleType(),
                quote.getVehicleBodyType(),
                quote.getLoadMethod(),
                quote.getUnloadMethod(),
                resolvePickupScheduleStart(quote),
                resolveDeliveryDeadline(quote),
                resolveDeliveryDeadline(quote),
                quote.getStatus(),
                quote.getCreatedAt(),
                quote.getUpdatedAt(),
                quoteItems == null ? List.of() : quoteItems,
                stops == null ? List.of() : stops
        );
    }

    @Transactional
    public List<QuoteListResponse> listQuotes() {
        Long shipperId = getCurrentShipperId();
        return quoteRepository.findByShipperId(shipperId).stream()
                .map(this::toListResponse)
                .collect(Collectors.toList());
    }

    @Transactional
    public QuoteDetailResponse getQuote(String quoteIdentifier) {
        Long shipperId = getCurrentShipperId();
        Quote quote = getOwnedQuoteByIdentifier(quoteIdentifier, shipperId);
        Long quoteId = quote.getQuoteId();
        List<QuoteItemResponse> quoteItems = quoteItemRepository.findByQuoteId(quoteId).stream()
                .map(this::toQuoteItemResponse)
                .collect(Collectors.toList());
        List<QuoteChecklistItemResponse> items = quoteChecklistItemRepository.findByQuoteId(quoteId).stream()
                .map(this::toItemResponse)
                .collect(Collectors.toList());
        List<QuoteStopResponse> stops = quoteStopRepository.findByQuoteIdOrderBySeqAsc(quoteId).stream()
                .map(this::toStopResponse)
                .collect(Collectors.toList());
        return toDetailResponse(quote, quoteItems, items, stops);
    }

    @Transactional
    public QuoteDetailResponse updateQuote(String quoteIdentifier, QuoteUpdateRequest req) {
        Long shipperId = getCurrentShipperId();
        Quote quote = getOwnedQuoteByIdentifier(quoteIdentifier, shipperId);
        Long quoteId = quote.getQuoteId();
        boolean allowCombine = req.getAllowCombine() != null
                ? Boolean.TRUE.equals(req.getAllowCombine())
                : Boolean.TRUE.equals(quote.getAllowCombine());
        NormalizedSchedule schedule = normalizeScheduleFields(
                allowCombine,
                req.getPickupScheduleStart(),
                req.getDeliveryDeadline(),
                req.getDeliverySchedule()
        );
        ResolvedPoint originPoint = resolvePoint(
                req.getOriginAddress(),
                req.getOriginLat(),
                req.getOriginLng(),
                ErrorCode.ORIGIN_GEOCODE_FAILED
        );
        ResolvedPoint destinationPoint = resolvePoint(
                req.getDestinationAddress(),
                req.getDestinationLat(),
                req.getDestinationLng(),
                ErrorCode.DESTINATION_GEOCODE_FAILED
        );
        List<ResolvedStop> resolvedStops = resolveStops(req.getStops());
        int resolvedDistanceKm = calculateDistanceKm(originPoint, destinationPoint, resolvedStops);

        PricingResult pricing = calculatePricing(
                resolvedDistanceKm,
                req.getVehicleType(),
                req.getVehicleBodyType(),
                req.getLoadMethod(),
                req.getUnloadMethod(),
                allowCombine
        );
        int basePrice = pricing.rateWon().setScale(0, RoundingMode.HALF_UP).intValue();
        int weighted = pricing.weightedWon().setScale(0, RoundingMode.HALF_UP).intValue();
        int extraPrice = Math.max(0, weighted - basePrice);
        int finalPrice = pricing.finalChargeAfterDiscountWon()
                .setScale(0, RoundingMode.HALF_UP)
                .intValue();
        int desiredPrice = req.getDesiredPrice() != null ? req.getDesiredPrice() : finalPrice;

        quote.updateFrom(
                req.getTruckId(),
                originPoint.address(),
                normalizeText(req.getOriginAddressDetail()),
                destinationPoint.address(),
                normalizeText(req.getDestinationAddressDetail()),
                normalizeText(req.getSenderName()),
                normalizeText(req.getSenderPhone()),
                normalizeText(req.getReceiverName()),
                normalizeText(req.getReceiverPhone()),
                originPoint.lat(),
                originPoint.lng(),
                destinationPoint.lat(),
                destinationPoint.lng(),
                resolvedDistanceKm,
                req.getWeightKg(),
                req.getVolumeCbm(),
                req.getVehicleType(),
                req.getVehicleBodyType(),
                req.getCargoName(),
                req.getCargoType(),
                req.getCargoDesc(),
                basePrice,
                0,
                extraPrice,
                desiredPrice,
                finalPrice,
                allowCombine,
                req.getLoadMethod(),
                req.getUnloadMethod(),
                schedule.pickupScheduleStart(),
                schedule.deliveryDeadline(),
                schedule.deliveryDeadline()
        );

        quoteChecklistItemRepository.deleteByQuoteId(quoteId);
        saveChecklistItems(quoteId, req.getChecklistItems());

        quoteItemRepository.deleteByQuoteId(quoteId);
        saveQuoteItems(quoteId, req.getQuoteItems());

        quoteStopRepository.deleteByQuoteId(quoteId);
        saveStops(quoteId, resolvedStops);

        List<QuoteItemResponse> quoteItems = quoteItemRepository.findByQuoteId(quoteId).stream()
                .map(this::toQuoteItemResponse)
                .collect(Collectors.toList());
        List<QuoteChecklistItemResponse> responses = req.getChecklistItems() == null
                ? Collections.emptyList()
                : req.getChecklistItems().stream()
                        .map(item -> new QuoteChecklistItemResponse(
                                item.getChecklistItemId(),
                                item.getExtraInput(),
                                item.getExtraFee() == null ? BigDecimal.ZERO : item.getExtraFee()
                        ))
                        .collect(Collectors.toList());
        List<QuoteStopResponse> stops = quoteStopRepository.findByQuoteIdOrderBySeqAsc(quoteId).stream()
                .map(this::toStopResponse)
                .collect(Collectors.toList());
        return toDetailResponse(quote, quoteItems, responses, stops);
    }

    @Transactional
    public void deleteQuote(String quoteIdentifier) {
        Long shipperId = getCurrentShipperId();
        Quote quote = getOwnedQuoteByIdentifier(quoteIdentifier, shipperId);
        if (!quote.isOpen()) {
            throw new CustomException(ErrorCode.QUOTE_NOT_OPEN);
        }
        Long quoteId = quote.getQuoteId();

        List<Match> matches = matchRepository.findAllByQuoteId(quoteId);
        for (Match match : matches) {
            ensureDeletableMatch(match);
        }
        for (Match match : matches) {
            notificationRepository.deleteByMatchId(match.getMatchId());
        }
        if (!matches.isEmpty()) {
            matchRepository.deleteAll(matches);
        }

        counterOfferRepository.deleteByQuoteId(quoteId);
        quoteChecklistItemRepository.deleteByQuoteId(quoteId);
        quoteItemRepository.deleteByQuoteId(quoteId);
        quoteStopRepository.deleteByQuoteId(quoteId);
        quoteRepository.delete(quote);
    }

    private void ensureDeletableMatch(Match match) {
        if (match == null || match.getMatchId() == null) {
            return;
        }
        boolean progressed = match.getStatus() != Match.Status.READY
                || Boolean.TRUE.equals(match.getAccepted())
                || match.getDriverId() != null;
        boolean hasPayment = paymentRepository.existsByMatchId(match.getMatchId());
        boolean hasSettlement = settlementRepository.existsByMatchId(match.getMatchId());
        boolean hasPhoto = !deliveryPhotoRepository.findByMatchIdOrderByCreatedAtAsc(match.getMatchId()).isEmpty();

        if (progressed || hasPayment || hasSettlement || hasPhoto) {
            throw new CustomException(ErrorCode.INVALID_REQUEST);
        }
    }

    /** 견적 유효성 검증 + AI 분석 (가격/적재 안전성/배차 속도 예측) */
    @Transactional(readOnly = true)
    public QuoteValidationResponse validateQuote(QuoteCreateRequest req) {
        boolean allowCombine = Boolean.TRUE.equals(req.getAllowCombine());
        normalizeScheduleFields(
                allowCombine,
                req.getPickupScheduleStart(),
                req.getDeliveryDeadline(),
                req.getDeliverySchedule()
        );
        int resolvedDistanceKm = resolveDistanceForValidation(req);
        PricingResult pricing = calculatePricing(
                resolvedDistanceKm,
                req.getVehicleType(),
                req.getVehicleBodyType(),
                req.getLoadMethod(),
                req.getUnloadMethod(),
                allowCombine
        );

        int estimatedMin = pricing.totalMinWon().setScale(0, RoundingMode.HALF_UP).intValue();
        int estimatedMax = pricing.totalMaxWon().setScale(0, RoundingMode.HALF_UP).intValue();
        int estimatedWeighted = pricing.weightedWon().setScale(0, RoundingMode.HALF_UP).intValue();

        List<String> comments = new ArrayList<>();
        List<String> reasons = new ArrayList<>();
        List<String> actions = new ArrayList<>();

        Integer desired = req.getDesiredPrice();
        QuoteValidationResponse.PriceFit priceFit = QuoteValidationResponse.PriceFit.NORMAL;
        String priceLabel = "PRICE_OK";
        if (desired != null && desired > 0) {
            BigDecimal threshold = pricing.totalMinWon()
                    .multiply(new BigDecimal("0.85"))
                    .setScale(0, RoundingMode.HALF_UP);
            if (new BigDecimal(desired).compareTo(threshold) < 0) {
                comments.add("Desired price is lower than recommended minimum.");
                reasons.add("Desired price is lower than market minimum.");
                actions.add("USE_AVERAGE_PRICE");
                priceFit = QuoteValidationResponse.PriceFit.LOW;
                priceLabel = "PRICE_LOW";
            } else if (desired > estimatedMax) {
                comments.add("Desired price is above recommended range.");
                reasons.add("Desired price is above upper estimated range.");
                actions.add("USE_MIN_PRICE");
                priceFit = QuoteValidationResponse.PriceFit.HIGH;
                priceLabel = "PRICE_HIGH";
            } else {
                reasons.add("Desired price is within estimated range.");
            }
        } else {
            reasons.add("Desired price is missing.");
            actions.add("USE_AVERAGE_PRICE");
        }

        Integer weightKg = req.getWeightKg();
        PricingVehicleType vehicleType = PricingVehicleType.from(req.getVehicleType());
        int capacityKg = vehicleType == null ? 0 : vehicleType.getDefaultCapacityKg();
        int usagePercent = 0;
        QuoteValidationResponse.LoadSafety loadSafety = QuoteValidationResponse.LoadSafety.SAFE;
        String loadLabel = "LOAD_SAFE";

        if (weightKg != null && weightKg > 0 && vehicleType != null) {
            usagePercent = Math.min(100, (int) Math.round((weightKg * 100.0) / capacityKg));
            if (weightKg > capacityKg) {
                comments.add("Cargo weight exceeds selected vehicle capacity.");
                reasons.add("Cargo weight exceeds selected vehicle capacity.");
                actions.add("SELECT_HIGHER_VEHICLE");
                loadSafety = QuoteValidationResponse.LoadSafety.RISK;
                loadLabel = "LOAD_RISK";
            } else if (weightKg > capacityKg * 0.9) {
                comments.add("Cargo weight is near capacity limit.");
                reasons.add("Cargo weight is near capacity limit.");
                actions.add("CHECK_LOAD_PLAN");
                loadSafety = QuoteValidationResponse.LoadSafety.WARN;
                loadLabel = "LOAD_WARN";
            } else {
                reasons.add("Load ratio is within safe range.");
            }
        }

        String prompt = buildAiPrompt(req, pricing, comments, resolvedDistanceKm);
        String aiSummary = deepSeekClient.generateAdvice(prompt)
                .map(s -> {
                    comments.add(s);
                    return s;
                })
                .orElse("No additional AI advice.");

        if (actions.isEmpty()) {
            actions.add("USE_AVERAGE_PRICE");
        }

        QuoteValidationResponse.DispatchSpeed dispatchSpeed = determineDispatchSpeed(
                desired, estimatedMin, estimatedWeighted
        );
        QuoteValidationResponse.OverallStatus overallStatus = determineOverallStatus(
                loadSafety, priceFit, dispatchSpeed
        );
        String badge = switch (overallStatus) {
            case GOOD -> "GOOD";
            case NORMAL -> "NORMAL";
            case RISKY -> "RISKY";
        };

        return QuoteValidationResponse.builder()
                .estimatedMinPrice(estimatedMin)
                .estimatedMaxPrice(estimatedMax)
                .estimatedWeightedPrice(estimatedWeighted)
                .comments(comments)
                .overallStatus(overallStatus)
                .dispatchSpeed(dispatchSpeed)
                .badge(badge)
                .loadAnalysis(QuoteValidationResponse.LoadAnalysis.builder()
                        .currentKg(weightKg)
                        .capacityKg(capacityKg == 0 ? null : capacityKg)
                        .usagePercent(usagePercent)
                        .safety(loadSafety)
                        .label(loadLabel)
                        .build())
                .priceAnalysis(QuoteValidationResponse.PriceAnalysis.builder()
                        .userDesiredPrice(desired)
                        .minPrice(estimatedMin)
                        .maxPrice(estimatedMax)
                        .weightedPrice(estimatedWeighted)
                        .suggestedPrice(estimatedWeighted)
                        .fit(priceFit)
                        .label(priceLabel)
                        .build())
                .confidence(calculateConfidence(req, resolvedDistanceKm))
                .aiSummary(aiSummary)
                .reasons(reasons)
                .actions(actions)
                .build();
    }

    private QuoteValidationResponse.DispatchSpeed determineDispatchSpeed(
            Integer desired, int estimatedMin, int estimatedWeighted
    ) {
        if (desired == null || desired <= 0) {
            return QuoteValidationResponse.DispatchSpeed.NORMAL;
        }
        if (desired >= estimatedWeighted) {
            return QuoteValidationResponse.DispatchSpeed.FAST;
        }
        if (desired >= estimatedMin) {
            return QuoteValidationResponse.DispatchSpeed.NORMAL;
        }
        return QuoteValidationResponse.DispatchSpeed.SLOW;
    }

    private QuoteValidationResponse.OverallStatus determineOverallStatus(
            QuoteValidationResponse.LoadSafety loadSafety,
            QuoteValidationResponse.PriceFit priceFit,
            QuoteValidationResponse.DispatchSpeed dispatchSpeed
    ) {
        if (loadSafety == QuoteValidationResponse.LoadSafety.RISK
                || priceFit == QuoteValidationResponse.PriceFit.LOW
                || dispatchSpeed == QuoteValidationResponse.DispatchSpeed.SLOW) {
            return QuoteValidationResponse.OverallStatus.RISKY;
        }
        if (loadSafety == QuoteValidationResponse.LoadSafety.SAFE
                && priceFit == QuoteValidationResponse.PriceFit.NORMAL
                && dispatchSpeed == QuoteValidationResponse.DispatchSpeed.FAST) {
            return QuoteValidationResponse.OverallStatus.GOOD;
        }
        return QuoteValidationResponse.OverallStatus.NORMAL;
    }

    private double calculateConfidence(QuoteCreateRequest req, int resolvedDistanceKm) {
        int score = 0;
        if (resolvedDistanceKm > 0) {
            score += 20;
        }
        if (req.getVehicleType() != null && !req.getVehicleType().isBlank()) {
            score += 20;
        }
        if (req.getWeightKg() != null && req.getWeightKg() > 0) {
            score += 20;
        }
        if (req.getDesiredPrice() != null && req.getDesiredPrice() > 0) {
            score += 20;
        }
        if (req.getCargoName() != null && !req.getCargoName().isBlank()) {
            score += 20;
        }
        return score / 100.0;
    }

    private Quote getOwnedQuoteByIdentifier(String quoteIdentifier, Long shipperId) {
        Quote quote = findQuoteByIdentifier(quoteIdentifier);
        if (!shipperId.equals(quote.getShipperId())) {
            throw new CustomException(ErrorCode.AUTH_FORBIDDEN);
        }
        return quote;
    }

    private QuoteListResponse toListResponse(Quote quote) {
        return new QuoteListResponse(
                quote.getQuoteId(),
                sanitizePublicId(quote.getPublicId()),
                quote.getTruckId(),
                sanitizeDisplayText(quote.getOriginAddress()),
                sanitizeDisplayText(quote.getDestinationAddress()),
                quote.getDistanceKm(),
                quote.getVehicleType(),
                quote.getVehicleBodyType(),
                sanitizeCargoDisplayText(quote.getCargoName()),
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

    private QuoteItemResponse toQuoteItemResponse(QuoteItem item) {
        return new QuoteItemResponse(
                item.getQuoteItemId(),
                item.getItemName(),
                item.getItemType(),
                item.getItemDescription(),
                item.getQuantity(),
                item.getLengthCm(),
                item.getWidthCm(),
                item.getHeightCm(),
                item.getUnitWeightKg(),
                item.getUnitVolumeCbm(),
                item.getFragile(),
                item.getUpright(),
                item.getNoStack(),
                item.getBottomOnly(),
                item.getRotatable(),
                item.getStackable(),
                item.getMaxStackWeightKg(),
                item.getHandlingTags(),
                item.getSortOrder(),
                item.getDropStopSeq()
        );
    }

    private QuoteStopResponse toStopResponse(QuoteStop stop) {
        return new QuoteStopResponse(
                stop.getQuoteStopId(),
                stop.getSeq(),
                stop.getAddress(),
                stop.getLat(),
                stop.getLng(),
                stop.getContactName(),
                stop.getContactPhone(),
                stop.getDeptName(),
                stop.getManagerName()
        );
    }

    private QuoteDetailResponse toDetailResponse(
            Quote quote,
            List<QuoteItemResponse> quoteItems,
            List<QuoteChecklistItemResponse> items,
            List<QuoteStopResponse> stops
    ) {
        List<QuoteItemResponse> safeQuoteItems =
                quoteItems == null ? Collections.emptyList() : quoteItems;
        List<QuoteChecklistItemResponse> safeItems =
                items == null ? Collections.emptyList() : items;
        List<QuoteStopResponse> safeStops =
                stops == null ? Collections.emptyList() : stops;
        String originAddress = sanitizeDisplayText(quote.getOriginAddress());
        String destinationAddress = sanitizeDisplayText(quote.getDestinationAddress());
        String cargoName = sanitizeCargoDisplayText(quote.getCargoName());
        String cargoType = sanitizeDisplayText(quote.getCargoType());
        String cargoDesc = sanitizeDisplayText(quote.getCargoDesc());
        return new QuoteDetailResponse(
                quote.getQuoteId(),
                sanitizePublicId(quote.getPublicId()),
                quote.getShipperId(),
                quote.getTruckId(),
                originAddress,
                quote.getOriginAddressDetail(),
                destinationAddress,
                quote.getDestinationAddressDetail(),
                quote.getSenderName(),
                quote.getSenderPhone(),
                quote.getReceiverName(),
                quote.getReceiverPhone(),
                quote.getOriginLat(),
                quote.getOriginLng(),
                quote.getDestinationLat(),
                quote.getDestinationLng(),
                quote.getDistanceKm(),
                quote.getWeightKg(),
                quote.getVolumeCbm(),
                quote.getVehicleType(),
                quote.getVehicleBodyType(),
                cargoName,
                cargoType,
                cargoDesc,
                quote.getBasePrice(),
                quote.getDistancePrice(),
                quote.getExtraPrice(),
                quote.getDesiredPrice(),
                quote.getFinalPrice(),
                quote.getAllowCombine(),
                quote.getLoadMethod(),
                quote.getUnloadMethod(),
                resolvePickupScheduleStart(quote),
                resolveDeliveryDeadline(quote),
                resolveDeliveryDeadline(quote),
                quote.getStatus(),
                quote.getCreatedAt(),
                quote.getUpdatedAt(),
                safeQuoteItems,
                safeItems,
                safeStops
        );
    }

    private String normalizeText(String value) {
        if (value == null) {
            return null;
        }
        String normalized = value.trim();
        return normalized.isEmpty() ? null : normalized;
    }

    private String sanitizeDisplayText(String value) {
        String normalized = normalizeText(value);
        if (normalized == null) {
            return null;
        }
        if (normalized.indexOf('�') >= 0) {
            return null;
        }
        long questionCount = normalized.chars().filter(ch -> ch == '?').count();
        if (questionCount >= 3) {
            return null;
        }
        return normalized;
    }

    private String sanitizeCargoDisplayText(String value) {
        String normalized = sanitizeDisplayText(value);
        if (normalized == null) {
            return "일반 화물";
        }
        String upper = normalized.toUpperCase();
        if (upper.contains("DRIVER-CANCEL-") || upper.contains("SHIP-CANCEL-")) {
            return "일반 화물";
        }
        return normalized;
    }

    private NormalizedSchedule normalizeScheduleFields(
            boolean allowCombine,
            LocalDateTime pickupScheduleStart,
            LocalDateTime deliveryDeadline,
            LocalDateTime legacyDeliverySchedule
    ) {
        LocalDateTime pickupRaw = pickupScheduleStart != null ? pickupScheduleStart : legacyDeliverySchedule;
        LocalDateTime deadlineRaw = deliveryDeadline != null ? deliveryDeadline : legacyDeliverySchedule;

        if (pickupRaw == null && deadlineRaw != null) {
            pickupRaw = deadlineRaw;
        }
        if (deadlineRaw == null && pickupRaw != null) {
            deadlineRaw = pickupRaw;
        }
        if (pickupRaw == null || deadlineRaw == null) {
            throw new CustomException(ErrorCode.INVALID_REQUEST);
        }
        LocalDateTime now = LocalDateTime.now();

        if (allowCombine) {
            // 합짐은 날짜 단위로 관리: 상차 시작은 00:00, 도착 마감은 23:59:59.
            LocalDateTime normalizedPickup = pickupRaw.toLocalDate().atStartOfDay().withNano(0);
            LocalDateTime normalizedDeadline = deadlineRaw.toLocalDate().atTime(23, 59, 59).withNano(0);
            if (normalizedDeadline.isBefore(normalizedPickup) || normalizedDeadline.isBefore(now)) {
                throw new CustomException(ErrorCode.INVALID_REQUEST);
            }
            return new NormalizedSchedule(normalizedPickup, normalizedDeadline);
        }

        // 단건은 시간까지 정밀하게 사용한다.
        LocalDateTime normalizedPickup = pickupRaw.withSecond(0).withNano(0);
        LocalDateTime normalizedDeadline = deadlineRaw.withSecond(0).withNano(0);
        if (normalizedDeadline.isBefore(normalizedPickup) || normalizedDeadline.isBefore(now)) {
            throw new CustomException(ErrorCode.INVALID_REQUEST);
        }
        return new NormalizedSchedule(normalizedPickup, normalizedDeadline);
    }

    private record NormalizedSchedule(
            LocalDateTime pickupScheduleStart,
            LocalDateTime deliveryDeadline
    ) {
    }

    private LocalDateTime resolvePickupScheduleStart(Quote quote) {
        if (quote == null) {
            return null;
        }
        if (quote.getPickupScheduleStart() != null) {
            return quote.getPickupScheduleStart();
        }
        return resolveDeliveryDeadline(quote);
    }

    private LocalDateTime resolveDeliveryDeadline(Quote quote) {
        if (quote == null) {
            return null;
        }
        if (quote.getDeliveryDeadline() != null) {
            return quote.getDeliveryDeadline();
        }
        return quote.getDeliverySchedule();
    }

    private Quote findQuoteByIdentifier(String quoteIdentifier) {
        UUID publicId = parsePublicIdOrNull(quoteIdentifier);
        if (publicId != null) {
            if (!isUsablePublicId(publicId)) {
                throw new CustomException(ErrorCode.INVALID_REQUEST);
            }
            try {
                return quoteRepository.findByPublicId(publicId)
                        .orElseThrow(() -> new CustomException(ErrorCode.INVALID_REQUEST));
            } catch (IncorrectResultSizeDataAccessException e) {
                log.warn("Duplicate quote public_id detected. publicId={}", publicId);
                throw new CustomException(ErrorCode.INVALID_REQUEST);
            }
        }

        try {
            Long quoteId = Long.valueOf(quoteIdentifier);
            return quoteRepository.findById(quoteId)
                    .orElseThrow(() -> new CustomException(ErrorCode.INVALID_REQUEST));
        } catch (NumberFormatException e) {
            throw new CustomException(ErrorCode.INVALID_REQUEST);
        }
    }

    private UUID parsePublicIdOrNull(String quoteIdentifier) {
        if (quoteIdentifier == null || quoteIdentifier.isBlank()) {
            return null;
        }
        try {
            return UUID.fromString(quoteIdentifier.trim());
        } catch (IllegalArgumentException e) {
            return null;
        }
    }

    private UUID sanitizePublicId(UUID publicId) {
        return isUsablePublicId(publicId) ? publicId : null;
    }

    private boolean isUsablePublicId(UUID publicId) {
        return publicId != null && !ZERO_UUID.equals(publicId);
    }

    /** 운임 계산 (거리 + 차종 + 상하차 방식 + 합짐 할인) */
    private PricingResult calculatePricing(
            Integer distanceKm,
            String vehicleType,
            String vehicleBodyType,
            String loadMethod,
            String unloadMethod,
            boolean combinedShipment
    ) {
        if (distanceKm == null || distanceKm <= 0) {
            throw new CustomException(ErrorCode.INVALID_REQUEST);
        }
        PricingVehicleType type = PricingVehicleType.from(vehicleType);
        if (type == null) {
            throw new CustomException(ErrorCode.INVALID_REQUEST);
        }
        Set<SurchargeOptionRule> options = resolveOptionsByBodyType(vehicleBodyType);
        LoadHandlingMethod load = LoadHandlingMethod.from(loadMethod);
        LoadHandlingMethod unload = LoadHandlingMethod.from(unloadMethod);
        if (load == null || unload == null) {
            throw new CustomException(ErrorCode.INVALID_REQUEST);
        }
        return pricingCalculator.estimate(distanceKm, type, options, load, unload, combinedShipment);
    }

    private Set<SurchargeOptionRule> resolveOptionsByBodyType(String vehicleBodyType) {
        if (vehicleBodyType == null || vehicleBodyType.isBlank()) {
            return Set.of();
        }
        String normalized = vehicleBodyType.trim().toUpperCase();
        String code = mapBodyTypeToOptionCode(normalized);
        if (code == null) {
            return Set.of();
        }
        try {
            return surchargeOptionService.resolveOptionsByCodes(Set.of(code));
        } catch (IllegalArgumentException e) {
            throw new CustomException(ErrorCode.INVALID_REQUEST);
        }
    }

    private String mapBodyTypeToOptionCode(String bodyType) {
        return switch (bodyType) {
            case "LIFT" -> "LIFT";
            case "LIFT_WINGBODY" -> "LIFT_WINGBODY";
            case "TOP" -> "WINGBODY_TOP";
            case "WINGBODY" -> null;
            case "CARGO" -> null;
            default -> null;
        };
    }

    /** DeepSeek AI용 프롬프트 생성 (견적 진단 조언) */
    private String buildAiPrompt(
            QuoteCreateRequest req,
            PricingResult pricing,
            List<String> existingComments,
            int resolvedDistanceKm
    ) {
        StringBuilder sb = new StringBuilder();
        sb.append("Task: write Korean shipper-facing advice for freight quote validation. ");
        sb.append("Output must be plain text in Korean, 1-2 sentences only, no markdown. ");
        sb.append("Mention dispatch speed likelihood, load safety, and price adequacy in one concise flow. ");
        sb.append("Avoid absolute guarantees and avoid repeating the same number too many times.\n");
        sb.append("Input summary:\n");
        sb.append("- Distance (km): ").append(resolvedDistanceKm).append('\n');
        sb.append("- Vehicle type: ").append(req.getVehicleType()).append('\n');
        sb.append("- Vehicle option: ").append(req.getVehicleBodyType()).append('\n');
        sb.append("- Cargo name: ").append(req.getCargoName()).append('\n');
        sb.append("- Cargo description: ").append(req.getCargoDesc()).append('\n');
        sb.append("- Cargo weight (kg): ").append(req.getWeightKg()).append('\n');
        sb.append("- Desired price: ").append(req.getDesiredPrice()).append('\n');
        sb.append("- Load/Unload: ").append(req.getLoadMethod()).append(" / ").append(req.getUnloadMethod()).append('\n');
        sb.append("Estimated price range:\n");
        sb.append("- Min: ").append(pricing.totalMinWon()).append('\n');
        sb.append("- Max: ").append(pricing.totalMaxWon()).append('\n');
        if (existingComments != null && !existingComments.isEmpty()) {
            sb.append("Existing warnings:\n");
            for (String c : existingComments) {
                sb.append("- ").append(c).append('\n');
            }
        }
        sb.append("Writing style: practical, confident but not absolute, suitable for an in-app AI diagnosis card.\n");
        return sb.toString();
    }

    private void saveChecklistItems(Long quoteId, List<QuoteChecklistItemRequest> items) {
        if (items == null) {
            return;
        }
        Set<Long> seenChecklistIds = new java.util.HashSet<>();
        for (QuoteChecklistItemRequest item : items) {
            if (item == null || item.getChecklistItemId() == null || item.getChecklistItemId() <= 0) {
                throw new CustomException(ErrorCode.INVALID_REQUEST);
            }
            if (!seenChecklistIds.add(item.getChecklistItemId())) {
                throw new CustomException(ErrorCode.INVALID_REQUEST);
            }

            ChecklistItem catalogItem = checklistItemRepository.findById(item.getChecklistItemId())
                    .orElseThrow(() -> new CustomException(ErrorCode.INVALID_REQUEST));

            if (!Boolean.TRUE.equals(catalogItem.getEnabled())) {
                throw new CustomException(ErrorCode.INVALID_REQUEST);
            }

            // 실사용 입력 검증: 추가 입력이 필요한 항목은 값이 없으면 저장하지 않는다.
            String normalizedExtraInput = normalizeText(item.getExtraInput());
            if (Boolean.TRUE.equals(catalogItem.getRequiresExtraInput()) && normalizedExtraInput == null) {
                throw new CustomException(ErrorCode.INVALID_REQUEST);
            }
            if (!Boolean.TRUE.equals(catalogItem.getRequiresExtraInput())) {
                normalizedExtraInput = null;
            }

            // 클라이언트 전달 extraFee를 신뢰하지 않고 서버 카탈로그 기준 요금을 사용한다.
            BigDecimal fee = catalogItem.getBaseExtraFee() == null ? BigDecimal.ZERO : catalogItem.getBaseExtraFee();
            QuoteChecklistItem entity = QuoteChecklistItem.builder()
                    .quoteId(quoteId)
                    .checklistItemId(item.getChecklistItemId())
                    .extraInput(normalizedExtraInput)
                    .extraFee(fee)
                    .build();
            quoteChecklistItemRepository.save(entity);
        }
    }

    private void saveQuoteItems(Long quoteId, List<QuoteItemRequest> items) {
        if (items == null || items.isEmpty()) {
            return;
        }
        for (int i = 0; i < items.size(); i++) {
            QuoteItemRequest item = items.get(i);
            if (item == null) {
                continue;
            }
            String itemName = item.getItemName() == null ? "" : item.getItemName().trim();
            if (itemName.isEmpty()) {
                continue;
            }

            Integer quantity = item.getQuantity();
            if (quantity == null || quantity <= 0) {
                quantity = 1;
            }
            Integer sortOrder = item.getSortOrder() != null ? item.getSortOrder() : i;
            Double unitWeightKg = item.getUnitWeightKg();
            Double totalWeightKg = (unitWeightKg != null && unitWeightKg > 0)
                    ? unitWeightKg * quantity
                    : 0.0;

            QuoteItem entity = QuoteItem.builder()
                    .quoteId(quoteId)
                    .itemName(itemName)
                    .itemType(item.getItemType())
                    .itemDescription(item.getItemDescription())
                    .quantity(quantity)
                    .lengthCm(item.getLengthCm())
                    .widthCm(item.getWidthCm())
                    .heightCm(item.getHeightCm())
                    .unitWeightKg(unitWeightKg)
                    .weightKg(totalWeightKg)
                    .unitVolumeCbm(item.getUnitVolumeCbm())
                    .fragile(Boolean.TRUE.equals(item.getFragile()))
                    .upright(Boolean.TRUE.equals(item.getUpright()))
                    .noStack(Boolean.TRUE.equals(item.getNoStack()))
                    .bottomOnly(Boolean.TRUE.equals(item.getBottomOnly()))
                    .rotatable(item.getRotatable() == null ? Boolean.TRUE : item.getRotatable())
                    .stackable(item.getStackable() == null ? Boolean.TRUE : item.getStackable())
                    .maxStackWeightKg(item.getMaxStackWeightKg())
                    .handlingTags(item.getHandlingTags())
                    .sortOrder(sortOrder)
                    .dropStopSeq(StopOrderUtils.normalizeDropStopSeq(item.getDropStopSeq()))
                    .build();
            quoteItemRepository.save(entity);
        }
    }

    private void saveStops(Long quoteId, List<ResolvedStop> stops) {
        if (stops == null || stops.isEmpty()) {
            return;
        }
        for (ResolvedStop stop : stops) {
            QuoteStop entity = QuoteStop.builder()
                    .quoteId(quoteId)
                    .seq(stop.seq())
                    .address(stop.address())
                    .lat(stop.lat())
                    .lng(stop.lng())
                    .contactName(stop.contactName())
                    .contactPhone(stop.contactPhone())
                    .deptName(stop.deptName())
                    .managerName(stop.managerName())
                    .build();
            quoteStopRepository.save(entity);
        }
    }

    private int resolveDistanceForValidation(QuoteCreateRequest req) {
        ResolvedPoint originPoint = resolvePoint(
                req.getOriginAddress(),
                req.getOriginLat(),
                req.getOriginLng(),
                ErrorCode.ORIGIN_GEOCODE_FAILED
        );
        ResolvedPoint destinationPoint = resolvePoint(
                req.getDestinationAddress(),
                req.getDestinationLat(),
                req.getDestinationLng(),
                ErrorCode.DESTINATION_GEOCODE_FAILED
        );
        List<ResolvedStop> resolvedStops = resolveStops(req.getStops());
        return calculateDistanceKm(originPoint, destinationPoint, resolvedStops);
    }

    private List<ResolvedStop> resolveStops(List<QuoteStopRequest> stops) {
        if (stops == null || stops.isEmpty()) {
            return Collections.emptyList();
        }
        List<ResolvedStop> resolved = new ArrayList<>();
        for (QuoteStopRequest stop : stops) {
            if (stop == null) {
                throw new CustomException(ErrorCode.INVALID_REQUEST);
            }
            ResolvedPoint point = resolvePoint(
                    stop.getAddress(),
                    stop.getLat(),
                    stop.getLng(),
                    ErrorCode.STOP_GEOCODE_FAILED
            );
            resolved.add(new ResolvedStop(
                    stop.getSeq() == null ? resolved.size() + 1 : stop.getSeq(),
                    point.address(),
                    point.lat(),
                    point.lng(),
                    stop.getContactName(),
                    stop.getContactPhone(),
                    stop.getDeptName(),
                    stop.getManagerName()
            ));
        }
        return resolved;
    }

    private ResolvedPoint resolvePoint(String address, Double lat, Double lng, ErrorCode geocodeError) {
        String normalizedAddress = normalizeAddressOrThrow(address);
        if (geocodingService.isValidCoordinate(lat, lng)) {
            return new ResolvedPoint(normalizedAddress, lat, lng);
        }
        try {
            GeocodingResult result = geocodingService.geocode(normalizedAddress);
            return new ResolvedPoint(result.normalizedAddress(), result.lat(), result.lng());
        } catch (RuntimeException e) {
            log.warn("Geocoding failed. address='{}', cause='{}'", normalizedAddress, e.getMessage());
            throw new CustomException(geocodeError);
        }
    }

    private Quote healMissingCoordinatesIfPossible(Quote quote) {
        if (quote == null) {
            return quote;
        }

        Double originLat = quote.getOriginLat();
        Double originLng = quote.getOriginLng();
        Double destinationLat = quote.getDestinationLat();
        Double destinationLng = quote.getDestinationLng();
        boolean updated = false;

        if (!geocodingService.isValidCoordinate(originLat, originLng) && canGeocodeAddress(quote.getOriginAddress())) {
            try {
                GeocodingResult result = geocodingService.geocode(quote.getOriginAddress());
                originLat = result.lat();
                originLng = result.lng();
                updated = true;
            } catch (RuntimeException ex) {
                log.debug("origin geocode recovery failed. quoteId={}, message={}", quote.getQuoteId(), ex.getMessage());
            }
        }

        if (!geocodingService.isValidCoordinate(destinationLat, destinationLng) && canGeocodeAddress(quote.getDestinationAddress())) {
            try {
                GeocodingResult result = geocodingService.geocode(quote.getDestinationAddress());
                destinationLat = result.lat();
                destinationLng = result.lng();
                updated = true;
            } catch (RuntimeException ex) {
                log.debug("destination geocode recovery failed. quoteId={}, message={}", quote.getQuoteId(), ex.getMessage());
            }
        }

        if (!updated) {
            return quote;
        }

        quote.updateResolvedCoordinates(originLat, originLng, destinationLat, destinationLng);
        return quoteRepository.save(quote);
    }

    private boolean canGeocodeAddress(String address) {
        if (address == null || address.isBlank()) {
            return false;
        }
        if (address.contains("�")) {
            return false;
        }
        long questionCount = address.chars().filter(ch -> ch == '?').count();
        return questionCount < 2;
    }

    private String normalizeAddressOrThrow(String address) {
        if (address == null || address.isBlank()) {
            throw new CustomException(ErrorCode.INVALID_REQUEST);
        }
        return address.trim().replaceAll("\\s+", " ");
    }

    private int calculateDistanceKm(
            ResolvedPoint originPoint,
            ResolvedPoint destinationPoint,
            List<ResolvedStop> resolvedStops
    ) {
        List<RoutePoint> points = buildRoutePoints(originPoint, destinationPoint, resolvedStops);
        try {
            RouteDistanceService.RouteMetrics routeMetrics = routeDistanceService.calculateRouteMetrics(points);
            int rawDistanceKm = routeMetrics.distanceKm();
            int normalizedDistanceKm = normalizeDistanceKm(rawDistanceKm);
            log.info(
                    "Route distance resolved. rawDistance={}, normalizedDistanceKm={}, pointsCount={}",
                    rawDistanceKm,
                    normalizedDistanceKm,
                    points.size()
            );
            return normalizedDistanceKm;
        } catch (RuntimeException e) {
            log.warn("Route distance calculation failed. pointsCount={}, cause='{}'", points.size(), e.getMessage());
            throw new CustomException(ErrorCode.ROUTE_DISTANCE_FAILED);
        }
    }

    private List<RoutePoint> buildRoutePoints(
            ResolvedPoint originPoint,
            ResolvedPoint destinationPoint,
            List<ResolvedStop> resolvedStops
    ) {
        List<RoutePoint> points = new ArrayList<>();
        points.add(new RoutePoint(originPoint.lat(), originPoint.lng()));
        for (ResolvedStop stop : resolvedStops) {
            points.add(new RoutePoint(stop.lat(), stop.lng()));
        }
        points.add(new RoutePoint(destinationPoint.lat(), destinationPoint.lng()));
        return points;
    }

    private int resolveEstimatedTravelSeconds(Integer routeDurationSeconds, int distanceKm) {
        if (routeDurationSeconds != null && routeDurationSeconds > 0) {
            return routeDurationSeconds;
        }
        int safeSpeedKmh = Math.max(10, etaAverageSpeedKmh);
        long fallbackSeconds = (long) Math.ceil((distanceKm / (double) safeSpeedKmh) * 3600.0d);
        return (int) Math.max(60L, Math.min(fallbackSeconds, Integer.MAX_VALUE));
    }

    private int resolveHandlingBufferSeconds(int stopCount) {
        int safeBase = Math.max(0, etaBaseBufferSeconds);
        int safePerStop = Math.max(0, etaPerStopBufferSeconds);
        int safeMax = Math.max(safeBase, etaMaxBufferSeconds);
        long calculated = (long) safeBase + (long) Math.max(0, stopCount) * safePerStop;
        return (int) Math.max(safeBase, Math.min(calculated, safeMax));
    }

    private int normalizeDistanceKm(int rawDistanceKm) {
        if (rawDistanceKm <= 0) {
            throw new CustomException(ErrorCode.ROUTE_DISTANCE_FAILED);
        }
        // Guard against legacy/runtime mismatch where meters can be returned instead of km.
        if (rawDistanceKm > 500) {
            return Math.max(1, (int) Math.round(rawDistanceKm / 1000.0d));
        }
        return rawDistanceKm;
    }

    private record ResolvedPoint(String address, Double lat, Double lng) {
    }

    private record ResolvedStop(
            Integer seq,
            String address,
            Double lat,
            Double lng,
            String contactName,
            String contactPhone,
            String deptName,
            String managerName
    ) {
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
        String userId = authentication.getName();
        if (userId == null || userId.isBlank()) {
            throw new CustomException(ErrorCode.AUTH_UNAUTHORIZED);
        }
        try {
            return Long.valueOf(userId);
        } catch (NumberFormatException e) {
            throw new CustomException(ErrorCode.AUTH_UNAUTHORIZED);
        }
    }
}
