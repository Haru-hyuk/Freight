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
import com.freight.backend.pricing.LoadHandlingMethod;
import com.freight.backend.pricing.PricingCalculator;
import com.freight.backend.pricing.PricingResult;
import com.freight.backend.pricing.PricingVehicleType;
import com.freight.backend.pricing.SurchargeOptionRule;
import com.freight.backend.pricing.SurchargeOptionService;
import com.freight.backend.repository.QuoteChecklistItemRepository;
import com.freight.backend.repository.QuoteRepository;
import com.freight.backend.repository.QuoteStopRepository;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class QuoteService {

    private final QuoteRepository quoteRepository;
    private final QuoteChecklistItemRepository quoteChecklistItemRepository;
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
        saveStops(saved.getQuoteId(), req.getStops());

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
        List<QuoteStopResponse> stops = quoteStopRepository.findByQuoteIdOrderBySeqAsc(quoteId).stream()
                .map(this::toStopResponse)
                .collect(Collectors.toList());
        return toDetailResponse(quote, items, stops);
    }

    @Transactional
    public QuoteDetailResponse updateQuote(Long quoteId, QuoteUpdateRequest req) {
        Long shipperId = getCurrentShipperId();
        Quote quote = getOwnedQuote(quoteId, shipperId);

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

        quoteStopRepository.deleteByQuoteId(quoteId);
        saveStops(quoteId, req.getStops());

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
    public void deleteQuote(Long quoteId) {
        Long shipperId = getCurrentShipperId();
        Quote quote = getOwnedQuote(quoteId, shipperId);
        quoteChecklistItemRepository.deleteByQuoteId(quoteId);
        quoteStopRepository.deleteByQuoteId(quoteId);
        quoteRepository.delete(quote);
    }

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
        Integer desired = req.getDesiredPrice();
        if (desired != null && desired > 0) {
            BigDecimal threshold = pricing.totalMinWon()
                    .multiply(new BigDecimal("0.85"))
                    .setScale(0, RoundingMode.HALF_UP);
            if (new BigDecimal(desired).compareTo(threshold) < 0) {
                comments.add("희망금액이 예상 최저가의 85% 미만입니다. 매칭이 어려울 수 있어요.");
            }
        }

        Integer weightKg = req.getWeightKg();
        PricingVehicleType vehicleType = PricingVehicleType.from(req.getVehicleType());
        if (weightKg != null && weightKg > 0 && vehicleType != null) {
            int capacityKg = vehicleType.getDefaultCapacityKg();
            if (weightKg > capacityKg) {
                PricingVehicleType nextType = PricingVehicleType.nextHigher(vehicleType);
                if (nextType != null) {
                    comments.add(String.format(
                            "화물 중량이 선택 차량 적재한도(%dkg)를 초과합니다. %s 이상 차량을 선택해 주세요.",
                            capacityKg,
                            nextType.name()
                    ));
                } else {
                    comments.add(String.format(
                            "화물 중량이 선택 차량 적재한도(%dkg)를 초과합니다. 상위 차량을 선택해 주세요.",
                            capacityKg
                    ));
                }
            } else if (weightKg > capacityKg * 0.9) {
                PricingVehicleType nextType = PricingVehicleType.nextHigher(vehicleType);
                if (nextType != null) {
                    comments.add(String.format(
                            "화물 중량이 적재한도(%dkg)의 90%% 이상입니다. 여유를 위해 %s 차량을 검토해 주세요.",
                            capacityKg,
                            nextType.name()
                    ));
                }
            }
        }

        String prompt = buildAiPrompt(req, pricing, comments);
        deepSeekClient.generateAdvice(prompt).ifPresent(comments::add);

        return new QuoteValidationResponse(
                estimatedMin,
                estimatedMax,
                estimatedWeighted,
                comments
        );
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

    private String buildAiPrompt(QuoteCreateRequest req, PricingResult pricing, List<String> existingComments) {
        StringBuilder sb = new StringBuilder();
        sb.append("화주 견적 검증 조언을 1~2문장으로 작성해줘. ");
        sb.append("과도한 확정 표현은 피하고, 간결하게. ");
        sb.append("화물 이름/설명을 보고 필요한 체크리스트(예: 파손주의, 습기주의, 세워서 적재) 추천이 있으면 포함해줘.\n");
        sb.append("입력 요약:\n");
        sb.append("- 거리(km): ").append(req.getDistanceKm()).append('\n');
        sb.append("- 차량: ").append(req.getVehicleType()).append('\n');
        sb.append("- 차량 옵션: ").append(req.getVehicleBodyType()).append('\n');
        sb.append("- 화물명: ").append(req.getCargoName()).append('\n');
        sb.append("- 화물설명: ").append(req.getCargoDesc()).append('\n');
        sb.append("- 화물중량(kg): ").append(req.getWeightKg()).append('\n');
        sb.append("- 희망금액: ").append(req.getDesiredPrice()).append('\n');
        sb.append("- 상/하차: ").append(req.getLoadMethod()).append(" / ").append(req.getUnloadMethod()).append('\n');
        sb.append("예상 요금 범위:\n");
        sb.append("- 최소: ").append(pricing.totalMinWon()).append('\n');
        sb.append("- 최대: ").append(pricing.totalMaxWon()).append('\n');
        if (existingComments != null && !existingComments.isEmpty()) {
            sb.append("이미 생성된 경고:\n");
            for (String c : existingComments) {
                sb.append("- ").append(c).append('\n');
            }
        }
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
        String principal = String.valueOf(authentication.getPrincipal());
        return Long.valueOf(principal);
    }
}
