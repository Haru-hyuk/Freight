package com.freight.backend.service;

import com.freight.backend.dto.algorithm.LoadPlanPreviewRequest;
import com.freight.backend.dto.match.BatchAcceptMatchRequest;
import com.freight.backend.dto.match.BatchAcceptMatchResponse;
import com.freight.backend.dto.match.BatchStartTransitRequest;
import com.freight.backend.dto.match.BatchStartTransitResponse;
import com.freight.backend.dto.match.MatchResponse;
import com.freight.backend.entity.Driver;
import com.freight.backend.entity.FcmToken;
import com.freight.backend.entity.Match;
import com.freight.backend.entity.Notification;
import com.freight.backend.entity.Payment;
import com.freight.backend.entity.Quote;
import com.freight.backend.entity.QuoteItem;
import com.freight.backend.entity.Truck;
import com.freight.backend.exception.CustomException;
import com.freight.backend.exception.ErrorCode;
import com.freight.backend.repository.DriverRepository;
import com.freight.backend.repository.MatchRepository;
import com.freight.backend.repository.PaymentRepository;
import com.freight.backend.repository.QuoteItemRepository;
import com.freight.backend.repository.QuoteRepository;
import com.freight.backend.repository.TruckRepository;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Collection;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Locale;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class MatchService {

    private final MatchRepository matchRepository;
    private final QuoteRepository quoteRepository;
    private final QuoteItemRepository quoteItemRepository;
    private final PaymentRepository paymentRepository;
    private final DriverRepository driverRepository;
    private final TruckRepository truckRepository;
    private final AlgorithmGatewayService algorithmGatewayService;
    private final NotificationService notificationService;

    /**
     * 화주가 자신의 OPEN 견적에 대해 매칭 레코드를 생성한다.
     * - 동일 견적에 활성 매칭이 있으면 생성 불가
     * - 초기 상태는 READY, accepted=false
     */
    @Transactional
    public MatchResponse createMatch(Long shipperId, Long quoteId) {
        Quote quote = quoteRepository.findById(quoteId)
                .orElseThrow(() -> new CustomException(ErrorCode.INVALID_REQUEST));

        if (!quote.getShipperId().equals(shipperId)) {
            throw new CustomException(ErrorCode.AUTH_FORBIDDEN);
        }
        if (!quote.isOpen()) {
            throw new CustomException(ErrorCode.QUOTE_NOT_OPEN);
        }
        Match existing = matchRepository.findByQuoteId(quoteId).orElse(null);
        if (existing != null && existing.getStatus() != Match.Status.CANCELLED) {
            // 배차요청 재시도는 멱등하게 허용해 오더마켓 노출 누락을 줄인다.
            if (existing.getStatus() == Match.Status.READY && !Boolean.TRUE.equals(existing.getAccepted())) {
                return MatchResponse.from(existing);
            }
            throw new CustomException(ErrorCode.MATCH_ALREADY_EXISTS);
        }

        Match match = Match.builder()
                .quoteId(quoteId)
                .driverId(null)
                .accepted(false)
                .status(Match.Status.READY)
                .build();

        Match saved = matchRepository.save(match);
        notificationService.createNotification(
                FcmToken.UserType.SHIPPER,
                shipperId,
                saved.getMatchId(),
                Notification.Type.MATCH_CREATED,
                "견적에 대한 매칭이 생성되었습니다."
        );
        return MatchResponse.from(saved);
    }

    /** 기사에게 노출되는 오픈 매칭 목록 조회 */
    @Transactional
    public List<MatchResponse> getOpenMatches(Long driverId) {
        backfillMissingOpenMatches();
        LocalDateTime now = LocalDateTime.now();
        List<Match> openMatches = matchRepository.findOpenMatchesForMarket(Match.Status.READY, now);
        List<Match> filteredMatches = filterOpenMatchesBySelectedTruck(driverId, openMatches);
        return filteredMatches
                .stream()
                .map(MatchResponse::from)
                .collect(Collectors.toList());
    }

    @Transactional
    public boolean ensureOpenMatchForQuote(Long quoteId) {
        if (quoteId == null || quoteId <= 0) {
            return false;
        }
        Quote quote = quoteRepository.findById(quoteId)
                .orElseThrow(() -> new CustomException(ErrorCode.INVALID_REQUEST));
        if (!quote.isOpen()) {
            return false;
        }

        Match existing = matchRepository.findByQuoteId(quoteId).orElse(null);
        if (existing != null && existing.getStatus() != Match.Status.CANCELLED) {
            return false;
        }

        Match match = Match.builder()
                .quoteId(quoteId)
                .driverId(null)
                .accepted(false)
                .status(Match.Status.READY)
                .build();
        matchRepository.save(match);
        return true;
    }

    /**
     * 단건 매칭 수락.
     * - READY 상태에서만 수락 가능
     * - acceptIfAvailable로 동시성 충돌 방지
     * - 수락 후 견적 상태를 MATCHED로 전이
     */
    @Transactional
    public MatchResponse acceptMatch(Long driverId, Long matchId) {
        Match current = matchRepository.findById(matchId)
                .orElseThrow(() -> new CustomException(ErrorCode.MATCH_NOT_FOUND));

        if (current.getStatus() != Match.Status.READY) {
            throw new CustomException(ErrorCode.INVALID_REQUEST);
        }

        validateTruckCapacityForQuotes(driverId, List.of(current.getQuoteId()));

        int updated = matchRepository.acceptIfAvailable(matchId, driverId, LocalDateTime.now());
        if (updated == 0) {
            throw new CustomException(ErrorCode.MATCH_ALREADY_ACCEPTED);
        }

        Match saved = matchRepository.findById(matchId)
                .orElseThrow(() -> new CustomException(ErrorCode.MATCH_NOT_FOUND));

        saved.assignGroup(null, "SINGLE", 1);
        matchRepository.save(saved);

        Quote quote = markQuoteMatched(saved.getQuoteId());

        notifyMatchAccepted(quote, saved.getMatchId());
        return MatchResponse.from(saved);
    }

    /**
     * 다건 매칭 일괄 수락.
     * - matchIds 정규화/검증
     * - 각 매칭 원자적 수락 처리
     * - 그룹 키/타입/순서를 부여해 합짐 묶음으로 관리
     */
    @Transactional
    public BatchAcceptMatchResponse acceptMatches(Long driverId, BatchAcceptMatchRequest request) {
        List<Long> requestedMatchIds = toDistinctPositiveIds(request == null ? null : request.getMatchIds());
        if (requestedMatchIds.isEmpty()) {
            throw new CustomException(ErrorCode.INVALID_REQUEST);
        }

        List<Match> found = matchRepository.findAllById(requestedMatchIds);
        if (found.size() != requestedMatchIds.size()) {
            throw new CustomException(ErrorCode.MATCH_NOT_FOUND);
        }

        Map<Long, Match> matchById = found.stream()
                .collect(Collectors.toMap(Match::getMatchId, m -> m));
        List<Long> orderedQuoteIds = resolveAcceptedQuoteIds(request, requestedMatchIds, matchById);
        validateTruckCapacityForQuotes(driverId, orderedQuoteIds);
        LocalDateTime acceptedAt = LocalDateTime.now();

        for (Long matchId : requestedMatchIds) {
            Match current = matchById.get(matchId);
            if (current == null) {
                throw new CustomException(ErrorCode.MATCH_NOT_FOUND);
            }
            if (current.getStatus() != Match.Status.READY) {
                throw new CustomException(ErrorCode.INVALID_REQUEST);
            }
            int updated = matchRepository.acceptIfAvailable(matchId, driverId, acceptedAt);
            if (updated == 0) {
                throw new CustomException(ErrorCode.MATCH_ALREADY_ACCEPTED);
            }
        }

        List<Match> acceptedMatches = matchRepository.findAllById(requestedMatchIds);
        Map<Long, Integer> requestedOrderByMatchId = new LinkedHashMap<>();
        for (int i = 0; i < requestedMatchIds.size(); i++) {
            requestedOrderByMatchId.put(requestedMatchIds.get(i), i + 1);
        }
        acceptedMatches.sort(Comparator.comparingInt(match ->
                requestedOrderByMatchId.getOrDefault(match.getMatchId(), Integer.MAX_VALUE)));
        Map<Long, Integer> quoteOrderMap = toQuoteOrderMap(request == null ? null : request.getOrderedQuoteIds());
        boolean grouped = acceptedMatches.size() > 1;
        String groupType = normalizeGroupType(request == null ? null : request.getRouteType(), grouped);
        String groupKey = grouped ? createMatchGroupKey(driverId) : null;

        for (int idx = 0; idx < acceptedMatches.size(); idx++) {
            Match acceptedMatch = acceptedMatches.get(idx);
            int groupOrder = quoteOrderMap.getOrDefault(acceptedMatch.getQuoteId(), idx + 1);
            acceptedMatch.assignGroup(groupKey, groupType, grouped ? groupOrder : 1);
            matchRepository.save(acceptedMatch);

            Quote quote = markQuoteMatched(acceptedMatch.getQuoteId());
            notifyMatchAccepted(quote, acceptedMatch.getMatchId());
        }

        List<MatchResponse> responses = acceptedMatches.stream()
                .sorted(Comparator.comparing(Match::getMatchGroupOrder, Comparator.nullsLast(Comparator.naturalOrder())))
                .map(MatchResponse::from)
                .collect(Collectors.toList());

        return BatchAcceptMatchResponse.builder()
                .matchGroupKey(groupKey)
                .matchGroupType(groupType)
                .acceptedCount(responses.size())
                .matches(responses)
                .build();
    }

    private Quote markQuoteMatched(Long quoteId) {
        Quote quote = quoteRepository.findById(quoteId)
                .orElseThrow(() -> new CustomException(ErrorCode.INVALID_REQUEST));
        quote.markMatched();
        return quoteRepository.save(quote);
    }

    private void notifyMatchAccepted(Quote quote, Long matchId) {
        notificationService.createNotification(
                FcmToken.UserType.SHIPPER,
                quote.getShipperId(),
                matchId,
                Notification.Type.MATCH_ACCEPTED,
                "A driver accepted your match."
        );
    }

    private List<Long> toDistinctPositiveIds(List<Long> values) {
        // null/중복/0이하 값 제거
        if (values == null || values.isEmpty()) {
            return List.of();
        }
        Set<Long> seen = new LinkedHashSet<>();
        for (Long value : values) {
            if (value != null && value > 0) {
                seen.add(value);
            }
        }
        return new ArrayList<>(seen);
    }

    private Map<Long, Integer> toQuoteOrderMap(List<Long> orderedQuoteIds) {
        // 요청한 quote 순서를 1-based 순서 맵으로 변환
        Map<Long, Integer> orderMap = new LinkedHashMap<>();
        if (orderedQuoteIds == null) {
            return orderMap;
        }
        int order = 1;
        for (Long quoteId : orderedQuoteIds) {
            if (quoteId == null || quoteId <= 0 || orderMap.containsKey(quoteId)) {
                continue;
            }
            orderMap.put(quoteId, order++);
        }
        return orderMap;
    }

    private String normalizeGroupType(String routeType, boolean grouped) {
        // 허용 타입 외 값은 다건 여부 기반 기본값으로 보정
        String normalized = routeType == null ? "" : routeType.trim().toUpperCase();
        if ("SINGLE".equals(normalized) || "BUNDLED".equals(normalized) || "HOME_ROUTE".equals(normalized)) {
            return normalized;
        }
        return grouped ? "BUNDLED" : "SINGLE";
    }

    private String createMatchGroupKey(Long driverId) {
        // 예: DRV-12-ABCDEF123456
        String suffix = UUID.randomUUID().toString().replace("-", "").substring(0, 12).toUpperCase();
        return "DRV-" + driverId + "-" + suffix;
    }

    private List<Long> resolveAcceptedQuoteIds(
            BatchAcceptMatchRequest request,
            List<Long> requestedMatchIds,
            Map<Long, Match> matchById
    ) {
        Map<Long, Long> quoteIdByMatchId = new LinkedHashMap<>();
        for (Long matchId : requestedMatchIds) {
            Match match = matchById.get(matchId);
            if (match == null || match.getQuoteId() == null) {
                throw new CustomException(ErrorCode.MATCH_NOT_FOUND);
            }
            quoteIdByMatchId.put(matchId, match.getQuoteId());
        }

        Set<Long> requestedQuoteIds = new LinkedHashSet<>(quoteIdByMatchId.values());
        List<Long> orderedQuoteIds = new ArrayList<>();
        if (request != null && request.getOrderedQuoteIds() != null) {
            for (Long quoteId : request.getOrderedQuoteIds()) {
                if (quoteId == null || quoteId <= 0 || !requestedQuoteIds.contains(quoteId) || orderedQuoteIds.contains(quoteId)) {
                    continue;
                }
                orderedQuoteIds.add(quoteId);
            }
        }

        for (Long matchId : requestedMatchIds) {
            Long quoteId = quoteIdByMatchId.get(matchId);
            if (quoteId != null && !orderedQuoteIds.contains(quoteId)) {
                orderedQuoteIds.add(quoteId);
            }
        }
        return orderedQuoteIds;
    }

    private void validateTruckCapacityForQuotes(Long driverId, List<Long> quoteIds) {
        List<Long> normalizedQuoteIds = toDistinctPositiveIds(quoteIds);
        if (normalizedQuoteIds.isEmpty()) {
            throw new CustomException(ErrorCode.INVALID_REQUEST);
        }

        Truck truck = resolveAcceptedTruck(driverId);
        Map<Long, Quote> quoteById = quoteRepository.findAllById(normalizedQuoteIds).stream()
                .collect(Collectors.toMap(Quote::getQuoteId, quote -> quote));
        if (quoteById.size() != normalizedQuoteIds.size()) {
            throw new CustomException(ErrorCode.INVALID_REQUEST);
        }

        Map<Long, List<QuoteItem>> itemsByQuoteId = fetchQuoteItems(normalizedQuoteIds);
        double totalWeightKg = 0.0;
        double totalVolumeCbm = 0.0;
        for (Long quoteId : normalizedQuoteIds) {
            Quote quote = quoteById.get(quoteId);
            if (quote == null) {
                throw new CustomException(ErrorCode.INVALID_REQUEST);
            }
            List<QuoteItem> quoteItems = itemsByQuoteId.getOrDefault(quoteId, List.of());
            totalWeightKg += deriveQuoteWeightKg(quote, quoteItems);
            totalVolumeCbm += deriveQuoteVolumeCbm(quote, quoteItems);
        }

        double maxWeightKg = safeBigDecimal(truck.getMaxWeight(), 0.0);
        if (maxWeightKg > 0 && totalWeightKg > maxWeightKg) {
            throw new CustomException(ErrorCode.INVALID_REQUEST);
        }

        double maxVolumeCbm = safeBigDecimal(truck.getMaxVolume(), 0.0);
        if (maxVolumeCbm > 0 && totalVolumeCbm > maxVolumeCbm) {
            throw new CustomException(ErrorCode.INVALID_REQUEST);
        }

        LoadPlanPreviewRequest loadPlanRequest = new LoadPlanPreviewRequest();
        loadPlanRequest.setTruckId(truck.getTruckId());
        loadPlanRequest.setQuoteIds(normalizedQuoteIds);
        Object preview = algorithmGatewayService.previewLoadPlan(driverId, loadPlanRequest);
        if (!(preview instanceof Map<?, ?> previewMap)) {
            throw new CustomException(ErrorCode.INTERNAL_ERROR);
        }

        Object unplaced = previewMap.get("unplaced");
        if (unplaced instanceof Collection<?> unplacedItems && !unplacedItems.isEmpty()) {
            throw new CustomException(ErrorCode.INVALID_REQUEST);
        }
    }

    private Truck resolveAcceptedTruck(Long driverId) {
        Driver driver = driverRepository.findById(driverId)
                .orElseThrow(() -> new CustomException(ErrorCode.AUTH_FORBIDDEN));

        Long selectedTruckId = driver.getSelectedTruckId();
        if (selectedTruckId == null) {
            throw new CustomException(ErrorCode.DRIVER_TRUCK_REQUIRED);
        }

        Truck truck = truckRepository.findById(selectedTruckId)
                .orElseThrow(() -> new CustomException(ErrorCode.DRIVER_TRUCK_REQUIRED));
        if (!driverId.equals(truck.getDriverId())) {
            throw new CustomException(ErrorCode.AUTH_FORBIDDEN);
        }
        if (!isApprovedTruck(truck)) {
            throw new CustomException(ErrorCode.DRIVER_TRUCK_REQUIRED);
        }
        return truck;
    }

    private List<Match> filterOpenMatchesBySelectedTruck(Long driverId, List<Match> openMatches) {
        if (driverId == null || openMatches == null || openMatches.isEmpty()) {
            return openMatches == null ? List.of() : openMatches;
        }

        Optional<Truck> truckOpt = resolveSelectedApprovedTruck(driverId);
        if (truckOpt.isEmpty()) {
            return openMatches;
        }
        Truck selectedTruck = truckOpt.orElseThrow();

        List<Long> quoteIds = openMatches.stream()
                .map(Match::getQuoteId)
                .filter(id -> id != null && id > 0)
                .distinct()
                .toList();
        if (quoteIds.isEmpty()) {
            return openMatches;
        }

        Map<Long, Quote> quoteById = quoteRepository.findAllById(quoteIds).stream()
                .collect(Collectors.toMap(Quote::getQuoteId, quote -> quote));
        return openMatches.stream()
                .filter(match -> canSelectedTruckHandleQuote(selectedTruck, quoteById.get(match.getQuoteId())))
                .collect(Collectors.toList());
    }

    private void backfillMissingOpenMatches() {
        List<Quote> openQuotes = quoteRepository.findByStatus("OPEN");
        if (openQuotes.isEmpty()) {
            return;
        }

        List<Long> openQuoteIds = openQuotes.stream()
                .map(Quote::getQuoteId)
                .filter(id -> id != null && id > 0)
                .toList();
        if (openQuoteIds.isEmpty()) {
            return;
        }

        Set<Long> activeMatchQuoteIds = matchRepository.findByQuoteIdIn(openQuoteIds).stream()
                .filter(match -> match.getStatus() != Match.Status.CANCELLED)
                .map(Match::getQuoteId)
                .filter(id -> id != null && id > 0)
                .collect(Collectors.toSet());

        List<Match> missingMatches = openQuotes.stream()
                .filter(Quote::isOpen)
                .filter(quote -> quote.getQuoteId() != null && quote.getQuoteId() > 0)
                .filter(quote -> !activeMatchQuoteIds.contains(quote.getQuoteId()))
                .map(quote -> Match.builder()
                        .quoteId(quote.getQuoteId())
                        .driverId(null)
                        .accepted(false)
                        .status(Match.Status.READY)
                        .build())
                .collect(Collectors.toList());

        if (!missingMatches.isEmpty()) {
            matchRepository.saveAll(missingMatches);
        }
    }

    private Optional<Truck> resolveSelectedApprovedTruck(Long driverId) {
        if (driverId == null) {
            return Optional.empty();
        }

        return driverRepository.findById(driverId)
                .flatMap(driver -> {
                    Long selectedTruckId = driver.getSelectedTruckId();
                    if (selectedTruckId == null) {
                        return Optional.empty();
                    }
                    return truckRepository.findById(selectedTruckId)
                            .filter(truck -> driverId.equals(truck.getDriverId()))
                            .filter(this::isApprovedTruck);
                });
    }

    private boolean canSelectedTruckHandleQuote(
            Truck truck,
            Quote quote
    ) {
        if (truck == null || quote == null) {
            return false;
        }
        if (!isVehicleTypeCompatible(truck.getVehicleType(), quote.getVehicleType())) {
            return false;
        }
        if (!isVehicleBodyTypeCompatible(truck.getVehicleBodyType(), quote.getVehicleBodyType())) {
            return false;
        }
        return true;
    }

    private boolean isVehicleTypeCompatible(String truckVehicleType, String quoteVehicleType) {
        String normalizedQuoteType = normalizeVehicleTypeToken(quoteVehicleType);
        if (normalizedQuoteType == null) {
            return true;
        }
        String normalizedTruckType = normalizeVehicleTypeToken(truckVehicleType);
        if (normalizedTruckType == null) {
            return false;
        }
        if (normalizedTruckType.equals(normalizedQuoteType)) {
            return true;
        }

        Double truckTonnage = extractVehicleTonnage(truckVehicleType);
        Double quoteTonnage = extractVehicleTonnage(quoteVehicleType);
        if (truckTonnage != null && quoteTonnage != null) {
            return truckTonnage >= quoteTonnage;
        }
        return false;
    }

    private boolean isVehicleBodyTypeCompatible(String truckBodyType, String quoteBodyType) {
        String normalizedQuoteBodyType = normalizeVehicleBodyType(quoteBodyType);
        if (normalizedQuoteBodyType == null) {
            return true;
        }
        String normalizedTruckBodyType = normalizeVehicleBodyType(truckBodyType);
        return normalizedTruckBodyType != null && normalizedTruckBodyType.equals(normalizedQuoteBodyType);
    }

    private String normalizeVehicleTypeToken(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        String normalized = value.trim().toUpperCase(Locale.ROOT)
                .replace("-", "")
                .replace("_", "")
                .replace(" ", "");
        return normalized.isBlank() ? null : normalized;
    }

    private String normalizeVehicleBodyType(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        String normalized = value.trim().toUpperCase(Locale.ROOT)
                .replace('-', '_')
                .replace(' ', '_');
        if ("WINGBODY".equals(normalized) || "WING_BODY".equals(normalized) || "WING".equals(normalized)) {
            return "WING_BODY";
        }
        if ("CARGO_TRUCK".equals(normalized) || "GENERAL".equals(normalized)) {
            return "CARGO";
        }
        if ("TOP_OPEN".equals(normalized) || "TOPLOAD".equals(normalized)) {
            return "TOP";
        }
        return normalized;
    }

    private Double extractVehicleTonnage(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        String normalized = value.trim().toUpperCase(Locale.ROOT)
                .replace("TON", "")
                .replace("_", "")
                .replace("-", "")
                .replace(" ", "");
        if (normalized.isBlank()) {
            return null;
        }
        try {
            return Double.parseDouble(normalized);
        } catch (NumberFormatException ignored) {
            return null;
        }
    }

    private boolean isApprovedTruck(Truck truck) {
        if (truck == null || !Boolean.TRUE.equals(truck.getApproved())) {
            return false;
        }
        String approvalStatus = truck.getApprovalStatus();
        return approvalStatus == null
                || approvalStatus.isBlank()
                || "APPROVED".equalsIgnoreCase(approvalStatus.trim());
    }

    private Map<Long, List<QuoteItem>> fetchQuoteItems(Collection<Long> quoteIds) {
        if (quoteIds == null || quoteIds.isEmpty()) {
            return Map.of();
        }
        Map<Long, List<QuoteItem>> grouped = new LinkedHashMap<>();
        for (QuoteItem item : quoteItemRepository.findByQuoteIdIn(quoteIds)) {
            grouped.computeIfAbsent(item.getQuoteId(), ignored -> new ArrayList<>()).add(item);
        }
        return grouped;
    }

    private double deriveQuoteWeightKg(Quote quote, List<QuoteItem> quoteItems) {
        if (quoteItems != null && !quoteItems.isEmpty()) {
            double itemWeight = quoteItems.stream()
                    .filter(item -> item.getUnitWeightKg() != null && item.getUnitWeightKg() > 0)
                    .mapToDouble(item -> item.getUnitWeightKg() * Math.max(1, item.getQuantity() == null ? 1 : item.getQuantity()))
                    .sum();
            if (itemWeight > 0) {
                return itemWeight;
            }
        }
        return Math.max(0.0, safeInteger(quote.getWeightKg()));
    }

    private double deriveQuoteVolumeCbm(Quote quote, List<QuoteItem> quoteItems) {
        if (quoteItems != null && !quoteItems.isEmpty()) {
            double itemVolume = quoteItems.stream()
                    .mapToDouble(item -> {
                        int quantity = Math.max(1, item.getQuantity() == null ? 1 : item.getQuantity());
                        if (item.getUnitVolumeCbm() != null && item.getUnitVolumeCbm() > 0) {
                            return item.getUnitVolumeCbm() * quantity;
                        }
                        if (item.getLengthCm() != null && item.getLengthCm() > 0
                                && item.getWidthCm() != null && item.getWidthCm() > 0
                                && item.getHeightCm() != null && item.getHeightCm() > 0) {
                            return (item.getLengthCm() * item.getWidthCm() * item.getHeightCm()) / 1_000_000.0 * quantity;
                        }
                        return 0.0;
                    })
                    .sum();
            if (itemVolume > 0) {
                return itemVolume;
            }
        }
        return Math.max(0.0, safeInteger(quote.getVolumeCbm()));
    }

    private double safeBigDecimal(BigDecimal value, double fallback) {
        return value == null ? fallback : value.doubleValue();
    }

    private double safeInteger(Integer value) {
        return value == null ? 0.0 : value.doubleValue();
    }

    @Transactional
    public void cancelMatch(Long userId, String role, Long matchId) {
        Match match = matchRepository.findById(matchId)
                .orElseThrow(() -> new CustomException(ErrorCode.MATCH_NOT_FOUND));

        Quote quote = quoteRepository.findById(match.getQuoteId())
                .orElseThrow(() -> new CustomException(ErrorCode.INVALID_REQUEST));

        boolean isShipperOwner = "ROLE_SHIPPER".equals(role) && quote.getShipperId().equals(userId);
        boolean isMatchedDriver = "ROLE_DRIVER".equals(role) && match.getDriverId() != null && match.getDriverId().equals(userId);

        if (!isShipperOwner && !isMatchedDriver) {
            throw new CustomException(ErrorCode.AUTH_FORBIDDEN);
        }

        // 결제 완료 후 취소는 환불 로직이 별도로 필요하므로 API 레벨에서 차단한다.
        if (paymentRepository.existsByMatchIdAndStatus(matchId, Payment.PaymentStatus.COMPLETED)) {
            throw new CustomException(ErrorCode.MATCH_CANCEL_NOT_ALLOWED_AFTER_PAYMENT);
        }
        // 운송이 시작되었거나 완료된 매칭은 취소할 수 없다.
        if (match.getStatus() == Match.Status.IN_TRANSIT || match.getStatus() == Match.Status.COMPLETED) {
            throw new CustomException(ErrorCode.INVALID_REQUEST);
        }

        match.cancel();
        quote.reopen();

        matchRepository.save(match);
        quoteRepository.save(quote);

        Long driverId = match.getDriverId();
        if ("ROLE_SHIPPER".equals(role) && driverId != null) {
            notificationService.createNotification(
                    FcmToken.UserType.DRIVER,
                    driverId,
                    match.getMatchId(),
                    Notification.Type.MATCH_CANCELLED,
                    "화주가 매칭을 취소했습니다."
            );
        }
        if ("ROLE_DRIVER".equals(role)) {
            notificationService.createNotification(
                    FcmToken.UserType.SHIPPER,
                    quote.getShipperId(),
                    match.getMatchId(),
                    Notification.Type.MATCH_CANCELLED,
                    "기사가 매칭을 취소했습니다."
            );
        }
    }

    @Transactional(readOnly = true)
    public MatchResponse getMatch(Long matchId, Long userId, String role) {
        if (userId == null) {
            throw new CustomException(ErrorCode.AUTH_FORBIDDEN);
        }
        Match match = matchRepository.findById(matchId)
                .orElseThrow(() -> new CustomException(ErrorCode.MATCH_NOT_FOUND));
        Quote quote = quoteRepository.findById(match.getQuoteId())
                .orElseThrow(() -> new CustomException(ErrorCode.INVALID_REQUEST));

        boolean isShipperOwner = "ROLE_SHIPPER".equals(role) && quote.getShipperId().equals(userId);
        boolean isMatchedDriver = "ROLE_DRIVER".equals(role) && userId.equals(match.getDriverId());
        // 오픈 매칭(아직 수락 안 됨)은 기사도 조회 가능
        boolean isOpenMatch = "ROLE_DRIVER".equals(role) && !match.getAccepted() && match.getDriverId() == null;

        if (!isShipperOwner && !isMatchedDriver && !isOpenMatch) {
            throw new CustomException(ErrorCode.AUTH_FORBIDDEN);
        }
        return MatchResponse.from(match);
    }

    @Transactional(readOnly = true)
    public List<MatchResponse> getDriverMatches(Long driverId) {
        return matchRepository.findByDriverIdAndStatusNot(driverId, Match.Status.CANCELLED)
                .stream()
                .map(MatchResponse::from)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<MatchResponse> getShipperMatches(Long shipperId) {
        return matchRepository.findByShipperIdAndStatusNotCancelled(shipperId)
                .stream()
                .map(MatchResponse::from)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public MatchResponse getMatchByQuoteId(Long quoteId) {
        Match match = matchRepository.findByQuoteId(quoteId)
                .orElseThrow(() -> new CustomException(ErrorCode.MATCH_NOT_FOUND));
        return MatchResponse.from(match);
    }

    @Transactional
    public MatchResponse startTransit(Long driverId, Long matchId) {
        Match match = matchRepository.findById(matchId)
                .orElseThrow(() -> new CustomException(ErrorCode.MATCH_NOT_FOUND));

        if (!Boolean.TRUE.equals(match.getAccepted())
                || match.getDriverId() == null
                || !match.getDriverId().equals(driverId)) {
            throw new CustomException(ErrorCode.AUTH_FORBIDDEN);
        }
        if (match.getStatus() != Match.Status.READY) {
            throw new CustomException(ErrorCode.INVALID_REQUEST);
        }
        if (!paymentRepository.existsByMatchIdAndStatus(matchId, Payment.PaymentStatus.COMPLETED)) {
            throw new CustomException(ErrorCode.MATCH_PAYMENT_REQUIRED);
        }

        Quote quote = quoteRepository.findById(match.getQuoteId())
                .orElseThrow(() -> new CustomException(ErrorCode.INVALID_REQUEST));

        match.startTransit();
        quote.markInTransit();

        Match saved = matchRepository.save(match);
        quoteRepository.save(quote);

        notificationService.createNotification(
                FcmToken.UserType.SHIPPER,
                quote.getShipperId(),
                saved.getMatchId(),
                Notification.Type.MATCH_UPDATED,
                "기사가 상차를 완료하여 운송이 시작되었습니다."
        );

        return MatchResponse.from(saved);
    }

    /**
     * 그룹 오더 일괄 운송 시작
     * - 동일 matchGroupKey를 가진 모든 매칭을 트랜잭션 내에서 일괄 처리
     * - 일부만 성공하는 상태 불일치 방지
     */
    @Transactional
    public BatchStartTransitResponse batchStartTransit(Long driverId, BatchStartTransitRequest request) {
        List<Long> matchIds = request.getMatchIds();
        if (matchIds == null || matchIds.isEmpty()) {
            throw new CustomException(ErrorCode.INVALID_REQUEST);
        }

        List<Match> matches = matchRepository.findAllById(matchIds);
        if (matches.size() != matchIds.size()) {
            throw new CustomException(ErrorCode.MATCH_NOT_FOUND);
        }

        // 모든 매칭이 동일 기사의 것인지, 시작 가능한 상태인지 먼저 검증
        String matchGroupKey = null;
        for (Match match : matches) {
            if (!Boolean.TRUE.equals(match.getAccepted())
                    || match.getDriverId() == null
                    || !match.getDriverId().equals(driverId)) {
                throw new CustomException(ErrorCode.AUTH_FORBIDDEN);
            }
            if (match.getStatus() != Match.Status.READY) {
                throw new CustomException(ErrorCode.INVALID_REQUEST);
            }
            if (!paymentRepository.existsByMatchIdAndStatus(match.getMatchId(), Payment.PaymentStatus.COMPLETED)) {
                throw new CustomException(ErrorCode.MATCH_PAYMENT_REQUIRED);
            }
            if (matchGroupKey == null) {
                matchGroupKey = match.getMatchGroupKey();
            }
        }

        // 모든 검증 통과 후 일괄 상태 변경
        List<MatchResponse> responses = new ArrayList<>();
        for (Match match : matches) {
            Quote quote = quoteRepository.findById(match.getQuoteId())
                    .orElseThrow(() -> new CustomException(ErrorCode.INVALID_REQUEST));

            match.startTransit();
            quote.markInTransit();

            Match saved = matchRepository.save(match);
            quoteRepository.save(quote);

            notificationService.createNotification(
                    FcmToken.UserType.SHIPPER,
                    quote.getShipperId(),
                    saved.getMatchId(),
                    Notification.Type.MATCH_UPDATED,
                    "기사가 상차를 완료하여 운송이 시작되었습니다."
            );

            responses.add(MatchResponse.from(saved));
        }

        return BatchStartTransitResponse.builder()
                .matchGroupKey(matchGroupKey)
                .startedCount(responses.size())
                .matches(responses)
                .build();
    }

    @Transactional
    public MatchResponse completeTransit(Long driverId, Long matchId) {
        Match match = matchRepository.findById(matchId)
                .orElseThrow(() -> new CustomException(ErrorCode.MATCH_NOT_FOUND));

        if (!Boolean.TRUE.equals(match.getAccepted())
                || match.getDriverId() == null
                || !match.getDriverId().equals(driverId)) {
            throw new CustomException(ErrorCode.AUTH_FORBIDDEN);
        }
        if (match.getStatus() != Match.Status.IN_TRANSIT) {
            throw new CustomException(ErrorCode.INVALID_REQUEST);
        }

        Quote quote = quoteRepository.findById(match.getQuoteId())
                .orElseThrow(() -> new CustomException(ErrorCode.INVALID_REQUEST));

        match.complete();
        quote.markDelivered();

        Match saved = matchRepository.save(match);
        quoteRepository.save(quote);

        notificationService.createNotification(
                FcmToken.UserType.SHIPPER,
                quote.getShipperId(),
                saved.getMatchId(),
                Notification.Type.MATCH_UPDATED,
                "기사가 배송을 완료했습니다. 화주가 이행 확인 후 정산을 확정해 주세요."
        );

        return MatchResponse.from(saved);
    }

    @Transactional
    public int releaseTimedOutAwaitingPaymentMatches(int timeoutMinutes) {
        int safeTimeoutMinutes = Math.max(1, timeoutMinutes);
        LocalDateTime cutoff = LocalDateTime.now().minusMinutes(safeTimeoutMinutes);
        List<Match> expiredAccepted = matchRepository.findByAcceptedTrueAndStatusAndAcceptedAtBefore(Match.Status.READY, cutoff);

        int releasedCount = 0;
        for (Match match : expiredAccepted) {
            if (paymentRepository.existsByMatchIdAndStatus(match.getMatchId(), Payment.PaymentStatus.COMPLETED)) {
                continue;
            }

            List<Payment> pendingPayments = paymentRepository.findByMatchIdAndStatus(match.getMatchId(), Payment.PaymentStatus.PENDING);
            for (Payment pending : pendingPayments) {
                pending.fail();
            }

            Quote quote = quoteRepository.findById(match.getQuoteId())
                    .orElseThrow(() -> new CustomException(ErrorCode.INVALID_REQUEST));
            Long prevDriverId = match.getDriverId();

            match.releaseForRematch();
            quote.reopen();

            matchRepository.save(match);
            quoteRepository.save(quote);
            releasedCount += 1;

            if (prevDriverId != null) {
                notificationService.createNotification(
                        FcmToken.UserType.DRIVER,
                        prevDriverId,
                        match.getMatchId(),
                        Notification.Type.MATCH_UPDATED,
                        "결제 대기 시간이 초과되어 매칭이 해제되었습니다."
                );
            }
            notificationService.createNotification(
                    FcmToken.UserType.SHIPPER,
                    quote.getShipperId(),
                    match.getMatchId(),
                    Notification.Type.MATCH_UPDATED,
                    "결제 대기 시간이 초과되어 매칭이 다시 오픈되었습니다."
            );
        }

        return releasedCount;
    }
}
