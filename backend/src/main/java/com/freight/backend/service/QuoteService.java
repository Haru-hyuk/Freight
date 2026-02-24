package com.freight.backend.service;

import com.freight.backend.ai.DeepSeekClient;
import com.freight.backend.dto.quote.DriverQuoteSummaryResponse;
import com.freight.backend.dto.quote.QuoteChecklistItemRequest;
import com.freight.backend.dto.quote.QuoteChecklistItemResponse;
import com.freight.backend.dto.quote.QuoteCreateRequest;
import com.freight.backend.dto.quote.QuoteCreateResponse;
import com.freight.backend.dto.quote.QuoteDetailResponse;
import com.freight.backend.dto.quote.QuoteItemRequest;
import com.freight.backend.dto.quote.QuoteItemResponse;
import com.freight.backend.dto.quote.QuoteListResponse;
import com.freight.backend.dto.quote.QuoteStopRequest;
import com.freight.backend.dto.quote.QuoteStopResponse;
import com.freight.backend.dto.quote.QuoteUpdateRequest;
import com.freight.backend.dto.quote.QuoteValidationResponse;
import com.freight.backend.entity.Quote;
import com.freight.backend.entity.QuoteChecklistItem;
import com.freight.backend.entity.QuoteItem;
import com.freight.backend.entity.QuoteStop;
import com.freight.backend.exception.CustomException;
import com.freight.backend.exception.ErrorCode;
import com.freight.backend.pricing.LoadHandlingMethod;
import com.freight.backend.pricing.PricingCalculator;
import com.freight.backend.pricing.PricingResult;
import com.freight.backend.pricing.PricingVehicleType;
import com.freight.backend.pricing.SurchargeOptionRule;
import com.freight.backend.pricing.SurchargeOptionService;
import com.freight.backend.repository.QuoteChecklistItemRepository;
import com.freight.backend.repository.QuoteItemRepository;
import com.freight.backend.repository.QuoteRepository;
import com.freight.backend.repository.QuoteStopRepository;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
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
@RequiredArgsConstructor
public class QuoteService {

    private final QuoteRepository quoteRepository;
    private final QuoteChecklistItemRepository quoteChecklistItemRepository;
    private final QuoteItemRepository quoteItemRepository;
    private final QuoteStopRepository quoteStopRepository;
    private final PricingCalculator pricingCalculator;
    private final SurchargeOptionService surchargeOptionService;
    private final DeepSeekClient deepSeekClient;

    @Transactional
    public QuoteCreateResponse createQuote(QuoteCreateRequest req) {
        Long shipperId = getCurrentShipperId();

        PricingResult pricing = calculatePricing(
                req.getDistanceKm(),
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
                .originAddress(req.getOriginAddress())
                .destinationAddress(req.getDestinationAddress())
                .originLat(req.getOriginLat())
                .originLng(req.getOriginLng())
                .destinationLat(req.getDestinationLat())
                .destinationLng(req.getDestinationLng())
                .distanceKm(req.getDistanceKm())
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
        saveQuoteItems(saved.getQuoteId(), req.getQuoteItems());
        saveStops(saved.getQuoteId(), req.getStops());

        return new QuoteCreateResponse(saved.getQuoteId(), saved.getPublicId());
    }



    @Transactional(readOnly = true)
    public DriverQuoteSummaryResponse getDriverQuoteSummary(Long quoteId) {
        Quote quote = quoteRepository.findById(quoteId)
                .orElseThrow(() -> new CustomException(ErrorCode.INVALID_REQUEST));

        int itemCount = quoteItemRepository.findByQuoteId(quoteId).stream()
                .mapToInt(item -> Math.max(1, item.getQuantity() == null ? 1 : item.getQuantity()))
                .sum();
        if (itemCount <= 0) {
            itemCount = 1;
        }

        return new DriverQuoteSummaryResponse(
                quote.getQuoteId(),
                quote.getOriginAddress(),
                quote.getDestinationAddress(),
                quote.getOriginLat(),
                quote.getOriginLng(),
                quote.getDestinationLat(),
                quote.getDestinationLng(),
                quote.getCargoName(),
                quote.getCargoType(),
                quote.getCargoDesc(),
                quote.getFinalPrice(),
                quote.getDistanceKm(),
                quote.getWeightKg(),
                quote.getVolumeCbm(),
                itemCount,
                quote.getAllowCombine(),
                quote.getVehicleType(),
                quote.getVehicleBodyType(),
                quote.getLoadMethod(),
                quote.getUnloadMethod()
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

        PricingResult pricing = calculatePricing(
                req.getDistanceKm(),
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
                req.getOriginAddress(),
                req.getDestinationAddress(),
                req.getOriginLat(),
                req.getOriginLng(),
                req.getDestinationLat(),
                req.getDestinationLng(),
                req.getDistanceKm(),
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

        quoteItemRepository.deleteByQuoteId(quoteId);
        saveQuoteItems(quoteId, req.getQuoteItems());

        quoteStopRepository.deleteByQuoteId(quoteId);
        saveStops(quoteId, req.getStops());

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
        Long quoteId = quote.getQuoteId();
        quoteChecklistItemRepository.deleteByQuoteId(quoteId);
        quoteItemRepository.deleteByQuoteId(quoteId);
        quoteStopRepository.deleteByQuoteId(quoteId);
        quoteRepository.delete(quote);
    }

    /** 견적 유효성 검증 + AI 분석 (가격/적재 안전성/배차 속도 예측) */
    @Transactional(readOnly = true)
    public QuoteValidationResponse validateQuote(QuoteCreateRequest req) {
        PricingResult pricing = calculatePricing(
                req.getDistanceKm(),
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

        String prompt = buildAiPrompt(req, pricing, comments);
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
                item.getSortOrder()
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
                safeQuoteItems,
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
    private String buildAiPrompt(QuoteCreateRequest req, PricingResult pricing, List<String> existingComments) {
        StringBuilder sb = new StringBuilder();
        sb.append("Task: write Korean shipper-facing advice for freight quote validation. ");
        sb.append("Output must be plain text in Korean, 1-2 sentences only, no markdown. ");
        sb.append("Mention dispatch speed likelihood, load safety, and price adequacy in one concise flow. ");
        sb.append("Avoid absolute guarantees and avoid repeating the same number too many times.\n");
        sb.append("Input summary:\n");
        sb.append("- Distance (km): ").append(req.getDistanceKm()).append('\n');
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
                    .build();
            quoteItemRepository.save(entity);
        }
    }

    private void saveStops(Long quoteId, List<QuoteStopRequest> stops) {
        if (stops == null || stops.isEmpty()) {
            return;
        }
        for (QuoteStopRequest stop : stops) {
            if (stop == null || stop.getAddress() == null || stop.getAddress().isBlank()) {
                continue;
            }
            QuoteStop entity = QuoteStop.builder()
                    .quoteId(quoteId)
                    .seq(stop.getSeq() == null ? 0 : stop.getSeq())
                    .address(stop.getAddress())
                    .lat(stop.getLat())
                    .lng(stop.getLng())
                    .contactName(stop.getContactName())
                    .contactPhone(stop.getContactPhone())
                    .deptName(stop.getDeptName())
                    .managerName(stop.getManagerName())
                    .build();
            quoteStopRepository.save(entity);
        }
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

