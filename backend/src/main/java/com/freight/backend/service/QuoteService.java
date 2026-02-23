package com.freight.backend.service;

import com.freight.backend.ai.DeepSeekClient;
import com.freight.backend.dto.quote.QuoteChecklistItemRequest;
import com.freight.backend.dto.quote.QuoteChecklistItemResponse;
import com.freight.backend.dto.quote.QuoteCreateRequest;
import com.freight.backend.dto.quote.QuoteCreateResponse;
import com.freight.backend.dto.quote.QuoteDetailResponse;
import com.freight.backend.dto.quote.QuoteListResponse;
import com.freight.backend.dto.quote.QuoteStopRequest;
import com.freight.backend.dto.quote.QuoteStopResponse;
import com.freight.backend.dto.quote.QuoteUpdateRequest;
import com.freight.backend.dto.quote.QuoteValidationResponse;
import com.freight.backend.entity.Quote;
import com.freight.backend.entity.QuoteChecklistItem;
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
import com.freight.backend.repository.QuoteChecklistItemRepository;
import com.freight.backend.repository.QuoteRepository;
import com.freight.backend.repository.QuoteStopRepository;
import com.freight.backend.routing.RouteDistanceService;
import com.freight.backend.routing.RoutePoint;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Slf4j
@RequiredArgsConstructor
public class QuoteService {

    private final QuoteRepository quoteRepository;
    private final QuoteChecklistItemRepository quoteChecklistItemRepository;
    private final QuoteStopRepository quoteStopRepository;
    private final PricingCalculator pricingCalculator;
    private final SurchargeOptionService surchargeOptionService;
    private final DeepSeekClient deepSeekClient;
    private final GeocodingService geocodingService;
    private final RouteDistanceService routeDistanceService;

    @Transactional
    public QuoteCreateResponse createQuote(QuoteCreateRequest req) {
        Long shipperId = getCurrentShipperId();
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
                Boolean.TRUE.equals(req.getAllowCombine())
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
                .destinationAddress(destinationPoint.address())
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
                .allowCombine(Boolean.TRUE.equals(req.getAllowCombine()))
                .loadMethod(req.getLoadMethod())
                .unloadMethod(req.getUnloadMethod())
                .status("OPEN")
                .build();

        Quote saved = quoteRepository.save(quote);

        saveChecklistItems(saved.getQuoteId(), req.getChecklistItems());
        saveStops(saved.getQuoteId(), resolvedStops);
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
        List<QuoteChecklistItemResponse> items = quoteChecklistItemRepository.findByQuoteId(quoteId).stream()
                .map(this::toItemResponse)
                .collect(Collectors.toList());
        List<QuoteStopResponse> stops = quoteStopRepository.findByQuoteIdOrderBySeqAsc(quoteId).stream()
                .map(this::toStopResponse)
                .collect(Collectors.toList());
        return toDetailResponse(quote, items, stops);
    }

    @Transactional
    public QuoteDetailResponse updateQuote(String quoteIdentifier, QuoteUpdateRequest req) {
        Long shipperId = getCurrentShipperId();
        Quote quote = getOwnedQuoteByIdentifier(quoteIdentifier, shipperId);
        Long quoteId = quote.getQuoteId();
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
                Boolean.TRUE.equals(req.getAllowCombine())
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
                destinationPoint.address(),
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
                Boolean.TRUE.equals(req.getAllowCombine()),
                req.getLoadMethod(),
                req.getUnloadMethod()
        );

        quoteChecklistItemRepository.deleteByQuoteId(quoteId);
        saveChecklistItems(quoteId, req.getChecklistItems());

        quoteStopRepository.deleteByQuoteId(quoteId);
        saveStops(quoteId, resolvedStops);

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
        return toDetailResponse(quote, responses, stops);
    }

    @Transactional
    public void deleteQuote(String quoteIdentifier) {
        Long shipperId = getCurrentShipperId();
        Quote quote = getOwnedQuoteByIdentifier(quoteIdentifier, shipperId);
        Long quoteId = quote.getQuoteId();
        quoteChecklistItemRepository.deleteByQuoteId(quoteId);
        quoteStopRepository.deleteByQuoteId(quoteId);
        quoteRepository.delete(quote);
    }

    @Transactional(readOnly = true)
    public QuoteValidationResponse validateQuote(QuoteCreateRequest req) {
        int resolvedDistanceKm = resolveDistanceForValidation(req);
        PricingResult pricing = calculatePricing(
                resolvedDistanceKm,
                req.getVehicleType(),
                req.getVehicleBodyType(),
                req.getLoadMethod(),
                req.getUnloadMethod(),
                Boolean.TRUE.equals(req.getAllowCombine())
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
                .confidence(calculateConfidence(req))
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

    private double calculateConfidence(QuoteCreateRequest req) {
        int score = 0;
        if (req.getDistanceKm() != null && req.getDistanceKm() > 0) {
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
    }private Quote getOwnedQuoteByIdentifier(String quoteIdentifier, Long shipperId) {
        Quote quote = findQuoteByIdentifier(quoteIdentifier);
        if (!shipperId.equals(quote.getShipperId())) {
            throw new CustomException(ErrorCode.AUTH_FORBIDDEN);
        }
        return quote;
    }

    private QuoteListResponse toListResponse(Quote quote) {
        return new QuoteListResponse(
                quote.getQuoteId(),
                quote.getPublicId(),
                quote.getTruckId(),
                quote.getOriginAddress(),
                quote.getDestinationAddress(),
                quote.getDistanceKm(),
                quote.getVehicleType(),
                quote.getVehicleBodyType(),
                quote.getCargoName(),
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
            List<QuoteChecklistItemResponse> items,
            List<QuoteStopResponse> stops
    ) {
        List<QuoteChecklistItemResponse> safeItems =
                items == null ? Collections.emptyList() : items;
        List<QuoteStopResponse> safeStops =
                stops == null ? Collections.emptyList() : stops;
        return new QuoteDetailResponse(
                quote.getQuoteId(),
                quote.getPublicId(),
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
                quote.getVehicleType(),
                quote.getVehicleBodyType(),
                quote.getCargoName(),
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
                safeItems,
                safeStops
        );
    }

    private Quote findQuoteByIdentifier(String quoteIdentifier) {
        UUID publicId = parsePublicIdOrNull(quoteIdentifier);
        if (publicId != null) {
            return quoteRepository.findByPublicId(publicId)
                    .orElseThrow(() -> new CustomException(ErrorCode.INVALID_REQUEST));
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
        try {
            return UUID.fromString(quoteIdentifier);
        } catch (IllegalArgumentException e) {
            return null;
        }
    }

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
        if (req.getDistanceKm() != null && req.getDistanceKm() > 0) {
            return req.getDistanceKm();
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
        List<RoutePoint> points = new ArrayList<>();
        points.add(new RoutePoint(originPoint.lat(), originPoint.lng()));
        for (ResolvedStop stop : resolvedStops) {
            points.add(new RoutePoint(stop.lat(), stop.lng()));
        }
        points.add(new RoutePoint(destinationPoint.lat(), destinationPoint.lng()));
        try {
            int rawDistanceKm = routeDistanceService.calculateDistanceKm(points);
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
        String principal = String.valueOf(authentication.getPrincipal());
        return Long.valueOf(principal);
    }
}

