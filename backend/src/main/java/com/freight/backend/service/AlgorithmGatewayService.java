package com.freight.backend.service;
import com.freight.backend.dto.algorithm.LoadPlanPreviewRequest;
import com.freight.backend.dto.algorithm.RouteRecommendRequest;
import com.freight.backend.dto.algorithm.RouteSelectionPreviewRequest;
import com.freight.backend.entity.Driver;
import com.freight.backend.entity.Match;
import com.freight.backend.entity.Quote;
import com.freight.backend.entity.QuoteItem;
import com.freight.backend.entity.QuoteStop;
import com.freight.backend.entity.Truck;
import com.freight.backend.exception.CustomException;
import com.freight.backend.exception.ErrorCode;
import com.freight.backend.geocoding.GeocodingResult;
import com.freight.backend.geocoding.GeocodingService;
import com.freight.backend.gpsload.loadplan.model.CargoItem;
import com.freight.backend.gpsload.loadplan.model.LoadPlanRequest;
import com.freight.backend.gpsload.loadplan.repository.TruckSpecCatalogRepository;
import com.freight.backend.gpsload.loadplan.service.LoadPlanService;
import com.freight.backend.gpsload.route.model.Place;
import com.freight.backend.gpsload.routeassembly.model.AssemblyParameters;
import com.freight.backend.gpsload.routeassembly.model.CargoVisit;
import com.freight.backend.gpsload.routeassembly.model.RecommendedRoute;
import com.freight.backend.gpsload.routeassembly.model.RouteAssemblyResponse;
import com.freight.backend.gpsload.routeassembly.model.DriverState;
import com.freight.backend.gpsload.routeassembly.model.RouteAssemblyRequest;
import com.freight.backend.gpsload.routeassembly.service.RouteAssemblyService;
import com.freight.backend.repository.MatchRepository;
import com.freight.backend.repository.DriverRepository;
import com.freight.backend.repository.QuoteItemRepository;
import com.freight.backend.repository.QuoteRepository;
import com.freight.backend.repository.QuoteStopRepository;
import com.freight.backend.repository.TruckRepository;
import com.freight.backend.util.StopOrderUtils;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Collection;
import java.util.Comparator;
import java.util.HashSet;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.PageRequest;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

/**
 * 알고리즘 게이트웨이 서비스
 * - 경로 추천 (합짐/노선조립)
 * - 3D 적재 계획 미리보기
 */
@Service
@RequiredArgsConstructor
public class AlgorithmGatewayService {

    private static final Logger log = LoggerFactory.getLogger(AlgorithmGatewayService.class);
    private static final int MAX_COORDINATE_REPAIR_PER_REQUEST = 5;

    private final QuoteRepository quoteRepository;
    private final QuoteItemRepository quoteItemRepository;
    private final TruckRepository truckRepository;
    private final DriverRepository driverRepository;
    private final MatchRepository matchRepository;
    private final QuoteStopRepository quoteStopRepository;
    private final RouteAssemblyService routeAssemblyService;
    private final LoadPlanService loadPlanService;
    private final GeocodingService geocodingService;
    private final TruckSpecCatalogRepository truckSpecCatalogRepository;

    @Value("${algorithm.gateway.default-max-pickup-distance-km:25.0}")
    private double defaultMaxPickupDistanceKm;

    @Value("${algorithm.gateway.max-candidate-quotes:80}")
    private int maxCandidateQuotes;

    @Value("${algorithm.gateway.open-quote-scan-limit:500}")
    private int openQuoteScanLimit;

    @Value("${algorithm.gateway.estimated-items-soft-mode:true}")
    private boolean estimatedItemsSoftMode;

    @Value("${algorithm.gateway.estimated-items-max-pieces:3}")
    private int estimatedItemsMaxPieces;

    @Value("${algorithm.gateway.estimated-items-max-dimension-ratio:0.65}")
    private double estimatedItemsMaxDimensionRatio;

    /** 기사 위치 기반 최적 경로/합짐 추천 */
    public Object recommendRoutes(Long driverId, RouteRecommendRequest request) {
        Truck truck = resolveTruck(driverId, request.getTruckId());
        List<Long> selectedQuoteIds = normalizeSelectedQuoteIds(request.getSelectedQuoteIds());
        double maxPickupDistanceKm = request.getMaxPickupDistanceKm() != null
                ? Math.max(0.0, request.getMaxPickupDistanceKm())
                : defaultMaxPickupDistanceKm;

        List<Quote> openQuotes = fetchOpenQuotesForRecommendation(
                request.getCurrentLat(),
                request.getCurrentLng(),
                maxPickupDistanceKm,
                selectedQuoteIds
        );
        if (!selectedQuoteIds.isEmpty() && openQuotes.isEmpty()) {
            throw new CustomException(ErrorCode.INVALID_REQUEST);
        }

        Map<Long, List<QuoteItem>> itemsByQuoteId = fetchQuoteItems(openQuotes.stream().map(Quote::getQuoteId).toList());
        Map<Long, List<Place>> waypointsByQuoteId = fetchQuoteWaypoints(openQuotes.stream().map(Quote::getQuoteId).toList());

        List<Map<String, Object>> candidates = new ArrayList<>();
        double loadedWeight = request.getLoadedWeightKg() == null ? 0.0 : Math.max(0.0, request.getLoadedWeightKg());
        double loadedVolume = request.getLoadedVolumeCbm() == null ? 0.0 : Math.max(0.0, request.getLoadedVolumeCbm());
        double truckMaxWeight = safeBigDecimal(truck.getMaxWeight(), 5000.0);
        double truckMaxVolume = safeBigDecimal(truck.getMaxVolume(), 10.0);
        double remainingWeight = Math.max(0.0, truckMaxWeight - loadedWeight);
        double remainingCbm = Math.max(0.0, truckMaxVolume - loadedVolume);
        int invalidLocationCount = 0;
        int vehicleMismatchCount = 0;
        int missingLoadSpecCount = 0;
        int truckDimensionMismatchCount = 0;
        int overCapacityCount = 0;
        int outOfRadiusCount = 0;
        int coordinateRepairAttemptedCount = 0;

        for (Quote rawQuote : openQuotes) {
            Quote q = rawQuote;
            if (!isQuoteLocationValid(q) && coordinateRepairAttemptedCount < MAX_COORDINATE_REPAIR_PER_REQUEST) {
                coordinateRepairAttemptedCount++;
                q = tryRepairQuoteCoordinates(q);
            }
            if (!isQuoteLocationValid(q)) {
                invalidLocationCount++;
                continue;
            }
            if (!isVehicleCompatible(truck, q)) {
                vehicleMismatchCount++;
                continue;
            }

            List<QuoteItem> quoteItems = itemsByQuoteId.getOrDefault(q.getQuoteId(), List.of());
            double quoteWeight = deriveQuoteWeightKg(q, quoteItems);
            double quoteCbm = deriveQuoteVolumeCbm(q, quoteItems);
            if (quoteWeight <= 0 || quoteCbm <= 0) {
                missingLoadSpecCount++;
                continue;
            }
            if (!isQuoteLoadCompatibleWithTruck(truck, q, quoteItems)) {
                truckDimensionMismatchCount++;
                continue;
            }
            if (quoteWeight > remainingWeight || quoteCbm > remainingCbm) {
                overCapacityCount++;
                continue;
            }

            double pickupDistanceKm = haversineKm(
                    request.getCurrentLat(),
                    request.getCurrentLng(),
                    q.getOriginLat(),
                    q.getOriginLng()
            );
            if (pickupDistanceKm > maxPickupDistanceKm) {
                outOfRadiusCount++;
                continue;
            }

            Map<String, Object> quote = new LinkedHashMap<>();
            quote.put("quoteId", q.getQuoteId());
            quote.put("origin", toPlacePayload(q.getOriginLat(), q.getOriginLng(), q.getOriginAddress()));
            quote.put("destination", toPlacePayload(q.getDestinationLat(), q.getDestinationLng(), q.getDestinationAddress()));
            quote.put("waypoints", waypointsByQuoteId.getOrDefault(q.getQuoteId(), List.of()));
            quote.put("volumeCbm", quoteCbm);
            quote.put("weightKg", quoteWeight);
            quote.put("allowCombine", Boolean.TRUE.equals(q.getAllowCombine()));
            quote.put("finalPrice", safeDouble(q.getFinalPrice(), 0.0));
            LocalDateTime pickupScheduleStart = resolvePickupScheduleStart(q);
            LocalDateTime deliveryDeadline = resolveDeliveryDeadline(q);
            quote.put("pickupScheduleStart", pickupScheduleStart);
            quote.put("deliveryDeadline", deliveryDeadline);
            quote.put("deliverySchedule", deliveryDeadline);
            quote.put("status", q.getStatus());
            quote.put("pickupDistanceKm", pickupDistanceKm);
            quote.put("itemCount", Math.max(1, totalItemCount(quoteItems)));
            quote.put("dataQuality", evaluateDataQuality(q, quoteItems));
            candidates.add(quote);
        }

        if (candidates.isEmpty()) {
            String emptyReason = buildEmptyCandidateReason(
                    openQuotes.size(),
                    invalidLocationCount,
                    vehicleMismatchCount,
                    missingLoadSpecCount,
                    truckDimensionMismatchCount,
                    overCapacityCount,
                    outOfRadiusCount
            );
            return new com.freight.backend.gpsload.routeassembly.model.RouteAssemblyResponse(
                    true,
                    emptyReason,
                    List.of(),
                    openQuotes.size(),
                    0,
                    0,
                    0
            );
        }

        candidates.sort(Comparator.comparingDouble(c -> safeDouble((Number) c.get("pickupDistanceKm"), Double.MAX_VALUE)));
        if (candidates.size() > maxCandidateQuotes) {
            candidates = new ArrayList<>(candidates.subList(0, maxCandidateQuotes));
        }

        Map<String, Object> driverState = new LinkedHashMap<>();
        driverState.put("driverId", driverId);
        driverState.put("currentLocation", toPlacePayload(request.getCurrentLat(), request.getCurrentLng(), null));
        if (request.getEndLat() != null && request.getEndLng() != null) {
            driverState.put("endLocation", toPlacePayload(request.getEndLat(), request.getEndLng(), null));
        }
        driverState.put("remainingCbm", remainingCbm);
        driverState.put("remainingWeight", remainingWeight);
        driverState.put("combinePreference", normalizeCombinePreference(request.getCombinePreference()));
        driverState.put("truckId", truck.getTruckId());
        TransitState transitState = buildTransitState(driverId, request.getCurrentLat(), request.getCurrentLng());
        if (!transitState.inTransitCargos().isEmpty()) {
            driverState.put("inTransitCargos", transitState.inTransitCargos());
        }
        if (!transitState.remainingDeliveries().isEmpty()) {
            driverState.put("remainingDeliveries", transitState.remainingDeliveries());
        }
        if (transitState.availableAt() != null) {
            driverState.put("availableAt", transitState.availableAt());
        }

        // Map candidates를 Quote record로 변환
        List<com.freight.backend.gpsload.routeassembly.model.Quote> quoteList = candidates.stream()
                .map(this::toQuoteRecord)
                .toList();

        // DriverState 생성
        Place currentLocation = new Place(null, null, request.getCurrentLat(), request.getCurrentLng());
        Place endLocation = (request.getEndLat() != null && request.getEndLng() != null)
                ? new Place(null, null, request.getEndLat(), request.getEndLng()) : null;

        DriverState driverStateRecord = new DriverState(
                driverId, currentLocation, endLocation,
                remainingCbm, remainingWeight,
                parseCombinePreference(request.getCombinePreference()),
                truck.getTruckId()
        );

        AssemblyParameters effectiveParams = buildEffectiveAssemblyParameters(request);
        RouteAssemblyRequest.RouteMode requestedMode = parseRouteMode(request.getMode());

        // RouteAssemblyRequest 생성 및 호출
        RouteAssemblyRequest assemblyRequest = new RouteAssemblyRequest(
                driverStateRecord, quoteList, effectiveParams, selectedQuoteIds, requestedMode
        );

        RouteAssemblyResponse primaryResponse = applyMaxVisitCountLimit(
                routeAssemblyService.recommend(assemblyRequest),
                request.getMaxVisitCount()
        );
        if (primaryResponse.hasRecommendations()) {
            return primaryResponse;
        }

        // 사용자가 선택한 견적이 있으면 선택 견적 자체를 우선 평가해 경로 공백을 줄인다.
        if (!selectedQuoteIds.isEmpty()) {
            Set<Long> selectedIdSet = new HashSet<>(selectedQuoteIds);
            List<com.freight.backend.gpsload.routeassembly.model.Quote> selectedQuotes = quoteList.stream()
                    .filter(q -> q != null && q.quoteId() != null && selectedIdSet.contains(q.quoteId()))
                    .toList();
            if (!selectedQuotes.isEmpty()) {
                RouteAssemblyResponse selectedEvaluation = applyMaxVisitCountLimit(
                        routeAssemblyService.evaluateSelectedQuotes(driverStateRecord, selectedQuotes, effectiveParams),
                        request.getMaxVisitCount()
                );
                if (selectedEvaluation.hasRecommendations()) {
                    return selectedEvaluation;
                }
            }
        }

        // SMART 모드에서 결과가 없으면 SIMPLE 모드로 한 번 더 평가한다.
        if (requestedMode == RouteAssemblyRequest.RouteMode.SMART) {
            RouteAssemblyRequest simpleRequest = new RouteAssemblyRequest(
                    driverStateRecord, quoteList, effectiveParams, selectedQuoteIds, RouteAssemblyRequest.RouteMode.SIMPLE
            );
            RouteAssemblyResponse simpleResponse = applyMaxVisitCountLimit(
                    routeAssemblyService.recommend(simpleRequest),
                    request.getMaxVisitCount()
            );
            if (simpleResponse.hasRecommendations()) {
                return simpleResponse;
            }
        }

        return primaryResponse;
    }

    private List<Quote> fetchOpenQuotesForRecommendation(
            double currentLat,
            double currentLng,
            double maxPickupDistanceKm,
            List<Long> selectedQuoteIds
    ) {
        if (selectedQuoteIds != null && !selectedQuoteIds.isEmpty()) {
            Set<Long> selectedIdSet = new HashSet<>(selectedQuoteIds);
            return quoteRepository.findByQuoteIdInAndStatus(selectedQuoteIds, "OPEN").stream()
                    .filter(q -> q != null && q.getQuoteId() != null && selectedIdSet.contains(q.getQuoteId()))
                    .sorted(Comparator.comparingInt(q -> selectedQuoteIds.indexOf(q.getQuoteId())))
                    .toList();
        }

        BoundingBox bbox = buildBoundingBox(currentLat, currentLng, maxPickupDistanceKm);
        int scanLimit = Math.max(Math.max(openQuoteScanLimit, maxCandidateQuotes), 100);
        return quoteRepository.findOpenCandidatesByOriginBoundingBox(
                "OPEN",
                bbox.minLat(),
                bbox.maxLat(),
                bbox.minLng(),
                bbox.maxLng(),
                PageRequest.of(0, scanLimit)
        );
    }

    private BoundingBox buildBoundingBox(double centerLat, double centerLng, double radiusKm) {
        double safeRadiusKm = Math.max(0.1, radiusKm);
        double latDelta = safeRadiusKm / 111.0;
        double cosLat = Math.cos(Math.toRadians(centerLat));
        double lngDelta = safeRadiusKm / (111.0 * Math.max(cosLat, 0.1));
        return new BoundingBox(
                centerLat - latDelta,
                centerLat + latDelta,
                centerLng - lngDelta,
                centerLng + lngDelta
        );
    }

    private record BoundingBox(double minLat, double maxLat, double minLng, double maxLng) {
    }

    /** 노선 선택 미리보기 (수락 없음) */
    public Object previewRouteSelection(Long driverId, RouteSelectionPreviewRequest request) {
        List<Long> requestedQuoteIds = normalizeSelectedQuoteIds(request.getQuoteIds());
        if (requestedQuoteIds.isEmpty()) {
            throw new CustomException(ErrorCode.INVALID_REQUEST);
        }

        RouteRecommendRequest recommendRequest = new RouteRecommendRequest();
        recommendRequest.setCurrentLat(request.getCurrentLat());
        recommendRequest.setCurrentLng(request.getCurrentLng());
        recommendRequest.setEndLat(request.getEndLat());
        recommendRequest.setEndLng(request.getEndLng());
        recommendRequest.setCombinePreference(request.getCombinePreference());
        recommendRequest.setMode(request.getMode());
        recommendRequest.setLoadedWeightKg(request.getLoadedWeightKg());
        recommendRequest.setLoadedVolumeCbm(request.getLoadedVolumeCbm());
        recommendRequest.setMaxPickupDistanceKm(request.getMaxPickupDistanceKm());
        recommendRequest.setMaxCombineCount(request.getMaxCombineCount());
        recommendRequest.setMaxRecommendations(request.getMaxRecommendations());
        recommendRequest.setMaxVisitCount(request.getMaxVisitCount());
        recommendRequest.setSelectedQuoteIds(requestedQuoteIds);
        recommendRequest.setTruckId(request.getTruckId());

        Object recommended = recommendRoutes(driverId, recommendRequest);
        if (!(recommended instanceof RouteAssemblyResponse routeSummary)) {
            throw new CustomException(ErrorCode.INTERNAL_ERROR);
        }

        RecommendedRoute selectedRoute = null;
        if (routeSummary.hasRecommendations()) {
            int selectedRank = request.getSelectedRouteRank() != null ? request.getSelectedRouteRank() : 1;
            selectedRoute = routeSummary.recommendations().stream()
                    .filter(route -> route != null && route.rank() == selectedRank)
                    .findFirst()
                    .orElse(routeSummary.topRecommendation());
        }

        List<Long> selectedQuoteIds = requestedQuoteIds;
        if (selectedRoute != null && selectedRoute.quoteIds() != null && !selectedRoute.quoteIds().isEmpty()) {
            selectedQuoteIds = normalizeSelectedQuoteIds(selectedRoute.quoteIds());
        }

        LoadPlanPreviewRequest loadPlanRequest = new LoadPlanPreviewRequest();
        loadPlanRequest.setTruckId(request.getTruckId());
        loadPlanRequest.setQuoteIds(selectedQuoteIds);
        Object loadPlan = previewLoadPlan(driverId, loadPlanRequest);

        Map<String, Object> response = new LinkedHashMap<>();
        response.put("success", true);
        response.put("accepted", false);
        response.put("acceptanceRequired", true);
        response.put("mode", parseRouteMode(request.getMode()).name());
        response.put("requestedQuoteIds", requestedQuoteIds);
        response.put("selectedQuoteIds", selectedQuoteIds);
        response.put("selectedRouteRank", selectedRoute != null ? selectedRoute.rank() : null);
        response.put("selectedRoute", selectedRoute);
        response.put("routeSummary", routeSummary);
        response.put("loadPlan", loadPlan);
        response.put("nextAction", "/api/route-assembly/accept");
        response.put("nextActionDescription", "노선 미리보기 후 사용자가 최종 확인하면 수락 API를 호출하세요.");
        return response;
    }

    /** 3D 적재 계획 미리보기 (LIFO 순서 기반) */
    public Object previewLoadPlan(Long driverId, LoadPlanPreviewRequest request) {
        Truck truck = resolveTruck(driverId, request.getTruckId());
        List<Quote> quotes = quoteRepository.findAllById(request.getQuoteIds());
        if (quotes.isEmpty()) {
            throw new CustomException(ErrorCode.INVALID_REQUEST);
        }

        Map<Long, Quote> quoteMap = quotes.stream().collect(Collectors.toMap(Quote::getQuoteId, Function.identity()));
        Map<Long, List<QuoteItem>> itemsByQuoteId = fetchQuoteItems(request.getQuoteIds());

        int[] dims = inferTruckDimensionsCm(truck);
        List<Map<String, Object>> items = new ArrayList<>();

        int stopOrder = 1;
        for (Long quoteId : request.getQuoteIds()) {
            Quote q = quoteMap.get(quoteId);
            if (q == null) {
                continue;
            }
            List<QuoteItem> quoteItems = itemsByQuoteId.getOrDefault(quoteId, List.of());
            if (quoteItems.isEmpty()) {
                items.addAll(expandQuoteToEstimatedItems(q, stopOrder, dims));
            } else {
                items.addAll(expandQuoteItems(q, quoteItems, stopOrder, dims));
            }
            stopOrder++;
        }

        if (items.isEmpty()) {
            throw new CustomException(ErrorCode.INVALID_REQUEST);
        }

        // items를 CargoItem record로 변환
        List<CargoItem> cargoItems = items.stream()
                .map(this::toCargoItemRecord)
                .toList();

        // Truck record 생성
        com.freight.backend.gpsload.loadplan.model.Truck truckModel = new com.freight.backend.gpsload.loadplan.model.Truck(
                truck.getTruckId(), dims[0], dims[1], dims[2],
                safeBigDecimal(truck.getMaxWeight(), 5000.0),
                inferDoorPosition(truck.getVehicleBodyType())
        );

        LoadPlanRequest loadRequest = new LoadPlanRequest(truckModel, cargoItems);
        com.freight.backend.gpsload.loadplan.model.LoadPlanResponse loadPlan = loadPlanService.plan(loadRequest);

        Map<String, Object> response = new LinkedHashMap<>();
        response.put("placements", loadPlan.placements());
        response.put("unplaced", loadPlan.unplaced());
        response.put("stats", loadPlan.stats());

        Map<String, Object> truckMeta = new LinkedHashMap<>();
        truckMeta.put("truckId", truck.getTruckId());
        truckMeta.put("vehicleType", truck.getVehicleType());
        truckMeta.put("vehicleBodyType", truck.getVehicleBodyType());
        truckMeta.put("doorPosition", inferDoorPosition(truck.getVehicleBodyType()));
        truckMeta.put("length", dims[0]);
        truckMeta.put("width", dims[1]);
        truckMeta.put("height", dims[2]);
        truckMeta.put("maxWeightKg", safeBigDecimal(truck.getMaxWeight(), 0.0));
        response.put("truck", truckMeta);

        return response;
    }

    private Map<Long, List<QuoteItem>> fetchQuoteItems(Collection<Long> quoteIds) {
        if (quoteIds == null || quoteIds.isEmpty()) {
            return Map.of();
        }
        List<QuoteItem> allItems = quoteItemRepository.findByQuoteIdIn(quoteIds);
        Map<Long, List<QuoteItem>> grouped = new HashMap<>();
        for (QuoteItem item : allItems) {
            grouped.computeIfAbsent(item.getQuoteId(), k -> new ArrayList<>()).add(item);
        }
        return grouped;
    }

    private Map<Long, List<Place>> fetchQuoteWaypoints(Collection<Long> quoteIds) {
        if (quoteIds == null || quoteIds.isEmpty()) {
            return Map.of();
        }

        List<Long> safeQuoteIds = quoteIds.stream()
                .filter(id -> id != null && id > 0)
                .distinct()
                .toList();
        if (safeQuoteIds.isEmpty()) {
            return Map.of();
        }

        List<QuoteStop> stops = quoteStopRepository.findByQuoteIdInOrderByQuoteIdAscSeqAsc(safeQuoteIds);
        Map<Long, List<Place>> grouped = new LinkedHashMap<>();
        for (QuoteStop stop : stops) {
            if (stop == null || stop.getQuoteId() == null || stop.getLat() == null || stop.getLng() == null) {
                continue;
            }
            grouped.computeIfAbsent(stop.getQuoteId(), ignored -> new ArrayList<>())
                    .add(new Place(null, stop.getAddress(), stop.getLat(), stop.getLng()));
        }
        return grouped;
    }

    private List<Map<String, Object>> expandQuoteItems(
            Quote quote,
            List<QuoteItem> quoteItems,
            int stopOrder,
            int[] truckDims
    ) {
        List<Map<String, Object>> items = new ArrayList<>();
        for (QuoteItem qi : quoteItems) {
            int quantity = Math.max(1, qi.getQuantity() == null ? 1 : qi.getQuantity());
            int[] dims = resolveDimensionsFromQuoteItem(qi, truckDims);
            double unitWeight = qi.getUnitWeightKg() != null && qi.getUnitWeightKg() > 0
                    ? qi.getUnitWeightKg()
                    : deriveWeightFromDimensions(dims);
            boolean fragile = Boolean.TRUE.equals(qi.getFragile()) || containsHandlingTag(qi.getHandlingTags(), "FRAGILE")
                    || containsHandlingTag(qi.getHandlingTags(), "EASY_BREAK");
            boolean upright = Boolean.TRUE.equals(qi.getUpright()) || containsHandlingTag(qi.getHandlingTags(), "UPRIGHT");
            boolean noStack = Boolean.TRUE.equals(qi.getNoStack());
            boolean bottomOnly = Boolean.TRUE.equals(qi.getBottomOnly());
            boolean rotatable = upright ? false : !Boolean.FALSE.equals(qi.getRotatable());
            boolean stackable = noStack ? false : !Boolean.FALSE.equals(qi.getStackable());
            int itemStopOrder = StopOrderUtils.mergeStopOrder(stopOrder, qi.getDropStopSeq());

            for (int i = 0; i < quantity; i++) {
                Map<String, Object> item = new LinkedHashMap<>();
                item.put("id", "QI-" + qi.getQuoteItemId() + "-" + (i + 1));
                item.put("length", dims[0]);
                item.put("width", dims[1]);
                item.put("height", dims[2]);
                item.put("weight", unitWeight);
                item.put("stopOrder", itemStopOrder);
                item.put("rotatable", rotatable);
                item.put("stackable", stackable);
                item.put("fragile", fragile);
                item.put("noStack", noStack);
                item.put("bottomOnly", bottomOnly);
                if (qi.getMaxStackWeightKg() != null && qi.getMaxStackWeightKg() > 0) {
                    item.put("maxStackWeight", qi.getMaxStackWeightKg());
                }
                items.add(item);
            }
        }
        if (items.isEmpty()) {
            items.addAll(expandQuoteToEstimatedItems(quote, stopOrder, truckDims));
        }
        return items;
    }

    private List<Map<String, Object>> expandQuoteToEstimatedItems(Quote quote, int stopOrder, int[] truckDims) {
        double totalCbm = Math.max(0.05, safeDouble(quote.getVolumeCbm(), 1.0));
        double totalWeight = Math.max(5.0, safeDouble(quote.getWeightKg(), 50.0));
        int pieces = Math.max(1, (int) Math.ceil(totalCbm / 2.0));
        if (estimatedItemsSoftMode) {
            pieces = Math.min(pieces, Math.max(1, estimatedItemsMaxPieces));
        }

        double pieceCbm = Math.max(estimatedItemsSoftMode ? 0.05 : 0.2, totalCbm / pieces);
        double pieceWeight = Math.max(estimatedItemsSoftMode ? 2.0 : 5.0, totalWeight / pieces);

        List<Map<String, Object>> items = new ArrayList<>();
        for (int i = 0; i < pieces; i++) {
            int[] cargoDims = inferCargoDimensionsFromCbm(pieceCbm, truckDims, estimatedItemsSoftMode);
            Map<String, Object> item = new LinkedHashMap<>();
            item.put("id", "Q-" + quote.getQuoteId() + "-" + (i + 1));
            item.put("length", cargoDims[0]);
            item.put("width", cargoDims[1]);
            item.put("height", cargoDims[2]);
            item.put("weight", pieceWeight);
            item.put("stopOrder", stopOrder);
            item.put("rotatable", true);
            item.put("stackable", true);
            item.put("fragile", false);
            item.put("noStack", false);
            item.put("bottomOnly", false);
            item.put("approximate", true);
            items.add(item);
        }
        return items;
    }

    private int[] resolveDimensionsFromQuoteItem(QuoteItem item, int[] truckDims) {
        Integer l = item.getLengthCm();
        Integer w = item.getWidthCm();
        Integer h = item.getHeightCm();
        if (l != null && l > 0 && w != null && w > 0 && h != null && h > 0) {
            return new int[]{l, w, h};
        }
        if (item.getUnitVolumeCbm() != null && item.getUnitVolumeCbm() > 0) {
            return inferCargoDimensionsFromCbm(item.getUnitVolumeCbm(), truckDims, estimatedItemsSoftMode);
        }
        int[] fallback = estimatedItemsSoftMode ? new int[]{90, 70, 50} : new int[]{100, 80, 60};
        return clampEstimatedDimensions(fallback, truckDims);
    }

    private double deriveWeightFromDimensions(int[] dimsCm) {
        double approxCbm = (dimsCm[0] * dimsCm[1] * dimsCm[2]) / 1_000_000.0;
        return Math.max(5.0, approxCbm * 120.0);
    }

    private boolean containsHandlingTag(String tags, String target) {
        if (tags == null || tags.isBlank()) {
            return false;
        }
        return tags.toUpperCase(Locale.ROOT).contains(target.toUpperCase(Locale.ROOT));
    }

    private boolean isQuoteLocationValid(Quote q) {
        return q.getOriginLat() != null
                && q.getOriginLng() != null
                && q.getDestinationLat() != null
                && q.getDestinationLng() != null;
    }

    private Quote tryRepairQuoteCoordinates(Quote quote) {
        if (quote == null) {
            return null;
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
                log.debug("origin geocode repair failed. quoteId={}, message={}", quote.getQuoteId(), ex.getMessage());
            }
        }

        if (!geocodingService.isValidCoordinate(destinationLat, destinationLng) && canGeocodeAddress(quote.getDestinationAddress())) {
            try {
                GeocodingResult result = geocodingService.geocode(quote.getDestinationAddress());
                destinationLat = result.lat();
                destinationLng = result.lng();
                updated = true;
            } catch (RuntimeException ex) {
                log.debug("destination geocode repair failed. quoteId={}, message={}", quote.getQuoteId(), ex.getMessage());
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

    private boolean isVehicleCompatible(Truck truck, Quote quote) {
        if (!isVehicleTypeCompatible(truck, quote)) {
            return false;
        }
        if (!isTonnageCompatible(truck, quote)) {
            return false;
        }
        return isVehicleBodyCompatible(truck, quote);
    }

    private boolean isVehicleTypeCompatible(Truck truck, Quote quote) {
        String required = normalizeVehicleType(quote.getVehicleType());
        if (required == null) {
            return true;
        }

        String actual = normalizeVehicleType(truck.getVehicleType());
        if (actual == null) {
            return true;
        }

        if (required.equals(actual)) {
            return true;
        }

        Double requiredTon = parseTonnageFromType(required);
        Double actualTon = parseTonnageFromType(actual);
        return requiredTon != null && actualTon != null && actualTon + 1e-9 >= requiredTon;
    }

    private boolean isTonnageCompatible(Truck truck, Quote quote) {
        Double required = parseTonnageFromType(quote.getVehicleType());
        if (required == null) {
            return true;
        }
        double truckTon = truck.getTonnage() == null ? 0.0 : truck.getTonnage().doubleValue();
        return truckTon <= 0.0 || truckTon + 1e-9 >= required;
    }

    private boolean isVehicleBodyCompatible(Truck truck, Quote quote) {
        String requested = normalizeBodyType(quote.getVehicleBodyType());
        if (requested == null) {
            return true;
        }
        String truckBody = normalizeBodyType(truck.getVehicleBodyType());
        if (truckBody == null) {
            return true;
        }
        return requested.equals(truckBody);
    }

    private String normalizeVehicleType(String vehicleType) {
        if (vehicleType == null || vehicleType.isBlank()) {
            return null;
        }
        return vehicleType.trim()
                .toLowerCase(Locale.ROOT)
                .replace(" ", "")
                .replace("_", "")
                .replace("-", "");
    }

    private String normalizeBodyType(String bodyType) {
        if (bodyType == null || bodyType.isBlank()) {
            return null;
        }
        String normalized = bodyType.trim().toLowerCase(Locale.ROOT)
                .replace(" ", "")
                .replace("_", "")
                .replace("-", "");
        if ("wing".equals(normalized) || "wingbody".equals(normalized)) return "wingbody";
        if ("cargotruck".equals(normalized) || "general".equals(normalized)) return "cargo";
        if ("topopen".equals(normalized) || "topload".equals(normalized)) return "top";
        if ("side".equals(normalized)) return "side_both";
        return normalized;
    }

    private double deriveQuoteWeightKg(Quote q, List<QuoteItem> quoteItems) {
        if (quoteItems != null && !quoteItems.isEmpty()) {
            double itemWeight = quoteItems.stream()
                    .filter(item -> item.getUnitWeightKg() != null && item.getUnitWeightKg() > 0)
                    .mapToDouble(item -> item.getUnitWeightKg() * Math.max(1, item.getQuantity() == null ? 1 : item.getQuantity()))
                    .sum();
            if (itemWeight > 0) {
                return itemWeight;
            }
        }

        double quoteWeight = safeDouble(q.getWeightKg(), 0.0);
        return quoteWeight > 0 ? quoteWeight : 0.0;
    }

    private double deriveQuoteVolumeCbm(Quote q, List<QuoteItem> quoteItems) {
        if (quoteItems != null && !quoteItems.isEmpty()) {
            double itemCbm = quoteItems.stream()
                    .mapToDouble(item -> {
                        int quantity = Math.max(1, item.getQuantity() == null ? 1 : item.getQuantity());
                        if (item.getUnitVolumeCbm() != null && item.getUnitVolumeCbm() > 0) {
                            return item.getUnitVolumeCbm() * quantity;
                        }
                        if (item.getLengthCm() != null && item.getLengthCm() > 0
                                && item.getWidthCm() != null && item.getWidthCm() > 0
                                && item.getHeightCm() != null && item.getHeightCm() > 0) {
                            double volume = (item.getLengthCm() * item.getWidthCm() * item.getHeightCm()) / 1_000_000.0;
                            return volume * quantity;
                        }
                        return 0.0;
                    })
                    .sum();
            if (itemCbm > 0) {
                return itemCbm;
            }
        }

        double quoteVolume = safeDouble(q.getVolumeCbm(), 0.0);
        return quoteVolume > 0 ? quoteVolume : 0.0;
    }

    private int totalItemCount(List<QuoteItem> quoteItems) {
        if (quoteItems == null || quoteItems.isEmpty()) {
            return 1;
        }
        return quoteItems.stream()
                .mapToInt(item -> Math.max(1, item.getQuantity() == null ? 1 : item.getQuantity()))
                .sum();
    }

    private Truck resolveDriverTruck(Long driverId) {
        Driver driver = driverRepository.findById(driverId)
                .orElseThrow(() -> new CustomException(ErrorCode.AUTH_FORBIDDEN));

        Long selectedTruckId = driver.getSelectedTruckId();
        if (selectedTruckId != null) {
            Truck selected = truckRepository.findById(selectedTruckId).orElse(null);
            if (selected != null) {
                if (!driverId.equals(selected.getDriverId())) {
                    throw new CustomException(ErrorCode.AUTH_FORBIDDEN);
                }
                if (isApprovedTruck(selected)) {
                    return selected;
                }
            }
            driver.clearSelectedTruck();
            driverRepository.save(driver);
        }

        Truck fallback = truckRepository.findByDriverId(driverId).stream()
                .filter(this::isApprovedTruck)
                .findFirst()
                .orElseThrow(() -> new CustomException(ErrorCode.DRIVER_TRUCK_REQUIRED));

        if (!fallback.getTruckId().equals(driver.getSelectedTruckId())) {
            driver.selectTruck(fallback.getTruckId());
            driverRepository.save(driver);
        }
        return fallback;
    }

    private Truck resolveTruck(Long driverId, Long truckId) {
        if (truckId != null) {
            Truck truck = truckRepository.findById(truckId)
                    .orElseThrow(() -> new CustomException(ErrorCode.INVALID_REQUEST));
            if (!truck.getDriverId().equals(driverId)) {
                throw new CustomException(ErrorCode.AUTH_FORBIDDEN);
            }
            if (!isApprovedTruck(truck)) {
                throw new CustomException(ErrorCode.DRIVER_TRUCK_REQUIRED);
            }
            return truck;
        }
        return resolveDriverTruck(driverId);
    }

    private boolean isApprovedTruck(Truck truck) {
        if (truck == null || !Boolean.TRUE.equals(truck.getApproved())) {
            return false;
        }
        String approvalStatus = truck.getApprovalStatus();
        if (approvalStatus == null || approvalStatus.isBlank()) {
            return true;
        }
        return "APPROVED".equalsIgnoreCase(approvalStatus.trim());
    }

    private double safeDouble(Number value, double fallback) {
        return value == null ? fallback : value.doubleValue();
    }

    private double safeBigDecimal(BigDecimal value, double fallback) {
        return value == null ? fallback : value.doubleValue();
    }

    private String normalizeCombinePreference(String raw) {
        if (raw == null || raw.isBlank()) {
            return "ALLOW";
        }
        String normalized = raw.trim().toUpperCase(Locale.ROOT);
        if ("DISALLOW".equals(normalized) || "HOME_ROUTE".equals(normalized) || "ALLOW".equals(normalized)) {
            return normalized;
        }
        return "ALLOW";
    }

    private AssemblyParameters buildEffectiveAssemblyParameters(RouteRecommendRequest request) {
        AssemblyParameters defaults = AssemblyParameters.defaults();
        double radiusKm = request.getMaxPickupDistanceKm() != null && request.getMaxPickupDistanceKm() > 0
                ? request.getMaxPickupDistanceKm()
                : defaults.radiusKm();
        int maxCombineCount = request.getMaxCombineCount() != null && request.getMaxCombineCount() > 0
                ? request.getMaxCombineCount()
                : defaults.maxCombineCount();
        int maxRecommendations = request.getMaxRecommendations() != null && request.getMaxRecommendations() > 0
                ? request.getMaxRecommendations()
                : defaults.maxRecommendations();

        return new AssemblyParameters(
                radiusKm,
                defaults.directionAngleDegrees(),
                maxCombineCount,
                defaults.consolidationWeight(),
                defaults.profitWeight(),
                defaults.routeWeight(),
                defaults.fuelCostPerKm(),
                defaults.baseHourlyCost(),
                maxRecommendations
        );
    }

    private int[] inferCargoDimensionsFromCbm(double cbm, int[] truckDims, boolean softMode) {
        double cm3 = Math.max(0.05, cbm) * 1_000_000.0;
        double divider = softMode ? 1.8 : 1.2;
        double base = Math.cbrt(cm3 / divider);
        int l = Math.max(35, (int) Math.round(base * (softMode ? 1.8 : 1.3)));
        int w = Math.max(30, (int) Math.round(base * (softMode ? 1.2 : 1.0)));
        int h = Math.max(20, (int) Math.round(base * (softMode ? 0.45 : 0.8)));
        return clampEstimatedDimensions(new int[]{l, w, h}, truckDims);
    }

    private int[] clampEstimatedDimensions(int[] dims, int[] truckDims) {
        if (!estimatedItemsSoftMode || truckDims == null || truckDims.length < 3 || dims == null || dims.length < 3) {
            return dims;
        }
        double ratio = Math.max(0.3, Math.min(0.95, estimatedItemsMaxDimensionRatio));
        int maxL = Math.max(35, (int) Math.floor(truckDims[0] * ratio));
        int maxW = Math.max(30, (int) Math.floor(truckDims[1] * ratio));
        int maxH = Math.max(20, (int) Math.floor(truckDims[2] * ratio));
        return new int[]{
                Math.min(dims[0], maxL),
                Math.min(dims[1], maxW),
                Math.min(dims[2], maxH)
        };
    }

    private int[] inferTruckDimensionsCm(Truck truck) {
        int l = toPositiveInt(truck.getCargoLength());
        int w = toPositiveInt(truck.getCargoWidth());
        int h = toPositiveInt(truck.getCargoHeight());
        if (l > 0 && w > 0 && h > 0) {
            return new int[]{l, w, h};
        }
        double tonnage = truck.getTonnage() == null ? 1.0 : truck.getTonnage().doubleValue();
        if (tonnage <= 1.0) return new int[]{310, 160, 170};
        if (tonnage <= 2.5) return new int[]{430, 200, 200};
        if (tonnage <= 5.0) return new int[]{620, 230, 230};
        return new int[]{960, 240, 250};
    }

    private String inferDoorPosition(String bodyType) {
        if (bodyType == null) return "rear";
        String normalized = normalizeBodyType(bodyType);
        if ("wingbody".equals(normalized) || "side_both".equals(normalized) || "sideboth".equals(normalized)) return "side_both";
        if ("cargo".equals(normalized) || "top".equals(normalized)) return "rear";
        if ("flat".equals(normalized) || "flatbed".equals(normalized)) return "top";
        if ("left".equals(normalized) || "right".equals(normalized) || "rear".equals(normalized)) {
            return normalized;
        }
        return "rear";
    }

    private boolean isQuoteLoadCompatibleWithTruck(Truck truck, Quote quote, List<QuoteItem> quoteItems) {
        int[] truckDims = inferTruckDimensionsCm(truck);
        double truckMaxWeight = safeBigDecimal(truck.getMaxWeight(), 5000.0);

        if (quoteItems == null || quoteItems.isEmpty()) {
            return true;
        }

        for (QuoteItem qi : quoteItems) {
            int[] dims = resolveDimensionsFromQuoteItem(qi, truckDims);
            boolean upright = Boolean.TRUE.equals(qi.getUpright()) || containsHandlingTag(qi.getHandlingTags(), "UPRIGHT");
            boolean rotatable = upright ? false : !Boolean.FALSE.equals(qi.getRotatable());
            if (!canFitInTruck(dims, truckDims, rotatable)) {
                return false;
            }
            if (qi.getUnitWeightKg() != null && qi.getUnitWeightKg() > truckMaxWeight) {
                return false;
            }
        }
        return true;
    }

    /** 화물이 트럭에 적재 가능한지 확인 (회전 고려) */
    private boolean canFitInTruck(int[] item, int[] truck, boolean rotatable) {
        int il = item[0], iw = item[1], ih = item[2];
        int tl = truck[0], tw = truck[1], th = truck[2];

        if (!rotatable) {
            return il <= tl && iw <= tw && ih <= th;
        }

        int[][] perms = new int[][]{
                {il, iw, ih}, {il, ih, iw}, {iw, il, ih},
                {iw, ih, il}, {ih, il, iw}, {ih, iw, il}
        };
        for (int[] p : perms) {
            if (p[0] <= tl && p[1] <= tw && p[2] <= th) {
                return true;
            }
        }
        return false;
    }

    private double evaluateDataQuality(Quote q, List<QuoteItem> quoteItems) {
        double score = 0.0;
        if (q.getOriginLat() != null && q.getOriginLng() != null && q.getDestinationLat() != null && q.getDestinationLng() != null) {
            score += 0.35;
        }
        if (q.getFinalPrice() != null && q.getFinalPrice() > 0) {
            score += 0.15;
        }
        if (quoteItems != null && !quoteItems.isEmpty()) {
            score += 0.5;
            long completeDims = quoteItems.stream()
                    .filter(i -> i.getLengthCm() != null && i.getLengthCm() > 0
                            && i.getWidthCm() != null && i.getWidthCm() > 0
                            && i.getHeightCm() != null && i.getHeightCm() > 0)
                    .count();
            if (completeDims < quoteItems.size()) {
                score -= 0.2;
            }
        }
        return Math.max(0.0, Math.min(1.0, score));
    }

    /** 현재 운송 중인 화물 상태 조회 (추가 합짐 계산용) */
    private TransitState buildTransitState(Long driverId, double currentLat, double currentLng) {
        List<Match> inTransitMatches = matchRepository.findByDriverIdAndStatus(driverId, Match.Status.IN_TRANSIT);
        if (inTransitMatches.isEmpty()) {
            return TransitState.empty();
        }

        List<Long> quoteIds = inTransitMatches.stream()
                .map(Match::getQuoteId)
                .filter(id -> id != null && id > 0)
                .distinct()
                .toList();
        Map<Long, Quote> quoteById = quoteRepository.findAllById(quoteIds).stream()
                .collect(Collectors.toMap(Quote::getQuoteId, Function.identity()));
        Map<Long, List<QuoteItem>> itemsByQuote = fetchQuoteItems(quoteIds);

        List<Map<String, Object>> inTransitCargos = new ArrayList<>();
        List<Map<String, Object>> remainingDeliveries = new ArrayList<>();

        for (Long quoteId : quoteIds) {
            Quote q = quoteById.get(quoteId);
            if (q == null) {
                continue;
            }
            List<QuoteItem> items = itemsByQuote.getOrDefault(quoteId, List.of());
            inTransitCargos.add(Map.of(
                    "quoteId", quoteId,
                    "weightKg", deriveQuoteWeightKg(q, items),
                    "volumeCbm", deriveQuoteVolumeCbm(q, items)
            ));

            List<QuoteStop> stops = quoteStopRepository.findByQuoteIdOrderBySeqAsc(quoteId);
            boolean addedStop = false;
            for (QuoteStop stop : stops) {
                if (stop.getLat() == null || stop.getLng() == null) {
                    continue;
                }
                Map<String, Object> stopPayload = new LinkedHashMap<>();
                stopPayload.put("quoteId", quoteId);
                stopPayload.put("seq", stop.getSeq());
                stopPayload.putAll(toPlacePayload(stop.getLat(), stop.getLng(), stop.getAddress()));
                remainingDeliveries.add(stopPayload);
                addedStop = true;
            }

            if (!addedStop && q.getDestinationLat() != null && q.getDestinationLng() != null) {
                Map<String, Object> fallbackStop = new LinkedHashMap<>();
                fallbackStop.put("quoteId", quoteId);
                fallbackStop.putAll(toPlacePayload(q.getDestinationLat(), q.getDestinationLng(), q.getDestinationAddress()));
                remainingDeliveries.add(fallbackStop);
            }
        }

        String availableAt = estimateAvailableAtIso(currentLat, currentLng, remainingDeliveries);
        return new TransitState(inTransitCargos, remainingDeliveries, availableAt);
    }

    private String estimateAvailableAtIso(double currentLat, double currentLng, List<Map<String, Object>> remainingDeliveries) {
        if (remainingDeliveries == null || remainingDeliveries.isEmpty()) {
            return null;
        }

        double cursorLat = currentLat;
        double cursorLng = currentLng;
        long minutes = 0L;
        for (Map<String, Object> stop : remainingDeliveries) {
            Double lat = asDouble(stop.get("lat"));
            Double lng = asDouble(stop.get("lng"));
            if (lat == null || lng == null) {
                continue;
            }
            double distKm = haversineKm(cursorLat, cursorLng, lat, lng) * 1.3;
            minutes += (long) Math.ceil((distKm / 40.0) * 60.0);
            minutes += 10L;
            cursorLat = lat;
            cursorLng = lng;
        }

        return LocalDateTime.now().plusMinutes(minutes).toString();
    }

    private Double asDouble(Object value) {
        if (value instanceof Number number) {
            return number.doubleValue();
        }
        return null;
    }

    private Map<String, Object> toPlacePayload(Double lat, Double lng, String address) {
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("latitude", lat);
        payload.put("longitude", lng);
        // 하위 호환: 기존 프론트/로그 포맷을 같이 유지
        payload.put("lat", lat);
        payload.put("lng", lng);
        if (address != null && !address.isBlank()) {
            payload.put("address", address);
        }
        return payload;
    }

    private List<Long> normalizeSelectedQuoteIds(List<Long> selectedQuoteIds) {
        if (selectedQuoteIds == null || selectedQuoteIds.isEmpty()) {
            return List.of();
        }
        return selectedQuoteIds.stream()
                .filter(id -> id != null && id > 0)
                .distinct()
                .toList();
    }

    private Double parseTonnageFromType(String vehicleType) {
        if (vehicleType == null || vehicleType.isBlank()) {
            return null;
        }

        String normalized = vehicleType.trim()
                .toUpperCase(Locale.ROOT)
                .replace('-', '_')
                .replace(' ', '_');
        String compact = normalized.replace("_", "");
        BigDecimal tonnageFromCatalog = resolveTonnageFromCatalog(normalized, compact);
        if (tonnageFromCatalog != null) {
            return tonnageFromCatalog.doubleValue();
        }

        if (normalized.startsWith("TON_")) {
            String token = normalized.substring(4);
            if (token.matches("\\d+_\\d+")) {
                try {
                    return Double.parseDouble(token.replace('_', '.'));
                } catch (NumberFormatException ignored) {
                    return null;
                }
            }
            if (token.matches("\\d+")) {
                try {
                    return Double.parseDouble(token);
                } catch (NumberFormatException ignored) {
                    return null;
                }
            }
        }

        Matcher matcher = Pattern.compile("(\\d+(?:[\\.,]\\d+)?)").matcher(normalized);
        if (matcher.find()) {
            try {
                return Double.parseDouble(matcher.group(1).replace(',', '.'));
            } catch (NumberFormatException ignored) {
                return null;
            }
        }
        return null;
    }

    private BigDecimal resolveTonnageFromCatalog(String normalizedVehicleType, String compactVehicleType) {
        List<BigDecimal> exactMatched = truckSpecCatalogRepository.findTonnagesByVehicleType(normalizedVehicleType);
        if (!exactMatched.isEmpty()) {
            return exactMatched.get(0);
        }

        List<BigDecimal> compactMatched = truckSpecCatalogRepository.findTonnagesByCompactVehicleType(compactVehicleType);
        if (!compactMatched.isEmpty()) {
            return compactMatched.get(0);
        }
        return null;
    }

    private record TransitState(
            List<Map<String, Object>> inTransitCargos,
            List<Map<String, Object>> remainingDeliveries,
            String availableAt
    ) {
        private static TransitState empty() {
            return new TransitState(List.of(), List.of(), null);
        }
    }

    private int toPositiveInt(BigDecimal value) {
        if (value == null || value.doubleValue() <= 0) {
            return 0;
        }
        return (int) Math.round(value.doubleValue());
    }

    /** 두 좌표 간 직선 거리 계산 (Haversine 공식) */
    private double haversineKm(double lat1, double lng1, double lat2, double lng2) {
        final double earthRadiusKm = 6371.0;
        double dLat = Math.toRadians(lat2 - lat1);
        double dLng = Math.toRadians(lng2 - lng1);
        double a = Math.sin(dLat / 2) * Math.sin(dLat / 2)
                + Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2))
                * Math.sin(dLng / 2) * Math.sin(dLng / 2);
        double c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return earthRadiusKm * c;
    }

    @SuppressWarnings("unchecked")
    private com.freight.backend.gpsload.routeassembly.model.Quote toQuoteRecord(Map<String, Object> map) {
        Long quoteId = map.get("quoteId") instanceof Number n ? n.longValue() : null;

        Map<String, Object> originMap = (Map<String, Object>) map.get("origin");
        Map<String, Object> destMap = (Map<String, Object>) map.get("destination");
        List<Place> waypoints = parseWaypoints(map.get("waypoints"));

        Place origin = toPlace(originMap);
        Place destination = toPlace(destMap);

        Double volumeCbm = asDoubleOrNull(map.get("volumeCbm"));
        Double weightKg = asDoubleOrNull(map.get("weightKg"));
        Boolean allowCombine = map.get("allowCombine") instanceof Boolean b ? b : null;
        Double finalPrice = asDoubleOrNull(map.get("finalPrice"));
        LocalDateTime pickupScheduleStart = asLocalDateTimeOrNull(map.get("pickupScheduleStart"));
        LocalDateTime deliveryDeadline = asLocalDateTimeOrNull(map.get("deliveryDeadline"));
        LocalDateTime deliverySchedule = asLocalDateTimeOrNull(map.get("deliverySchedule"));
        String status = map.get("status") instanceof String s ? s : null;

        LocalDateTime effectiveDeadline = deliveryDeadline != null ? deliveryDeadline : deliverySchedule;
        LocalDateTime effectivePickupStart = pickupScheduleStart != null ? pickupScheduleStart : deliverySchedule;

        return new com.freight.backend.gpsload.routeassembly.model.Quote(
                quoteId, origin, destination, waypoints, volumeCbm, weightKg, allowCombine, finalPrice,
                effectivePickupStart, effectiveDeadline, effectiveDeadline,
                null, null, null, null, null, null, null, null, null, status, null
        );
    }

    @SuppressWarnings("unchecked")
    private List<Place> parseWaypoints(Object value) {
        if (!(value instanceof List<?> rawList) || rawList.isEmpty()) {
            return List.of();
        }
        List<Place> waypoints = new ArrayList<>();
        for (Object item : rawList) {
            if (item instanceof Place place) {
                if (place.latitude() == null || place.longitude() == null) {
                    continue;
                }
                waypoints.add(new Place(null, place.address(), place.latitude(), place.longitude()));
                continue;
            }
            if (!(item instanceof Map<?, ?> rawMap)) {
                continue;
            }
            Place waypoint = toPlace((Map<String, Object>) rawMap);
            if (waypoint == null || waypoint.latitude() == null || waypoint.longitude() == null) {
                continue;
            }
            waypoints.add(waypoint);
        }
        return waypoints;
    }

    private Place toPlace(Map<String, Object> map) {
        if (map == null) return null;
        Double lat = asDoubleOrNull(map.get("latitude"));
        if (lat == null) lat = asDoubleOrNull(map.get("lat"));
        Double lng = asDoubleOrNull(map.get("longitude"));
        if (lng == null) lng = asDoubleOrNull(map.get("lng"));
        String address = map.get("address") instanceof String s ? s : null;
        return new Place(null, address, lat, lng);
    }

    private Double asDoubleOrNull(Object value) {
        if (value instanceof Number n) return n.doubleValue();
        return null;
    }

    private LocalDateTime asLocalDateTimeOrNull(Object value) {
        if (value instanceof LocalDateTime dt) {
            return dt;
        }
        if (value instanceof String s && !s.isBlank()) {
            try {
                return LocalDateTime.parse(s);
            } catch (RuntimeException ignored) {
                return null;
            }
        }
        return null;
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

    private LocalDateTime resolvePickupScheduleStart(Quote quote) {
        if (quote == null) {
            return null;
        }
        if (quote.getPickupScheduleStart() != null) {
            return quote.getPickupScheduleStart();
        }
        return quote.getDeliverySchedule();
    }

    private String buildEmptyCandidateReason(
            int totalOpenQuotes,
            int invalidLocationCount,
            int vehicleMismatchCount,
            int missingLoadSpecCount,
            int truckDimensionMismatchCount,
            int overCapacityCount,
            int outOfRadiusCount
    ) {
        List<String> reasons = new ArrayList<>();
        if (invalidLocationCount > 0) {
            reasons.add("좌표 누락 " + invalidLocationCount + "건");
        }
        if (vehicleMismatchCount > 0) {
            reasons.add("차량 조건 불일치 " + vehicleMismatchCount + "건");
        }
        if (missingLoadSpecCount > 0) {
            reasons.add("중량/부피 정보 누락 " + missingLoadSpecCount + "건");
        }
        if (truckDimensionMismatchCount > 0) {
            reasons.add("화물 치수 초과 " + truckDimensionMismatchCount + "건");
        }
        if (overCapacityCount > 0) {
            reasons.add("잔여 적재용량 초과 " + overCapacityCount + "건");
        }
        if (outOfRadiusCount > 0) {
            reasons.add("픽업 반경 초과 " + outOfRadiusCount + "건");
        }
        if (reasons.isEmpty()) {
            return "추천 가능한 견적이 없습니다. 필터 조건을 확인해 주세요.";
        }
        return String.format(
                "추천 가능한 견적이 없습니다. (총 OPEN %d건, 탈락 사유: %s)",
                totalOpenQuotes,
                String.join(", ", reasons)
        );
    }

    private CargoItem toCargoItemRecord(Map<String, Object> map) {
        String id = map.get("id") instanceof String s ? s : "unknown";
        int length = map.get("length") instanceof Number n ? n.intValue() : 100;
        int width = map.get("width") instanceof Number n ? n.intValue() : 80;
        int height = map.get("height") instanceof Number n ? n.intValue() : 60;
        double weight = map.get("weight") instanceof Number n ? n.doubleValue() : 50.0;
        Integer stopOrder = map.get("stopOrder") instanceof Number n ? n.intValue() : 1;
        Boolean rotatable = map.get("rotatable") instanceof Boolean b ? b : true;
        Boolean stackable = map.get("stackable") instanceof Boolean b ? b : true;
        Boolean fragile = map.get("fragile") instanceof Boolean b ? b : false;
        Boolean noStack = map.get("noStack") instanceof Boolean b ? b : false;
        Boolean bottomOnly = map.get("bottomOnly") instanceof Boolean b ? b : false;
        Double maxStackWeight = map.get("maxStackWeight") instanceof Number n ? n.doubleValue() : null;

        return new CargoItem(id, length, width, height, weight, stopOrder, rotatable, stackable, fragile, noStack, bottomOnly, maxStackWeight, null);
    }

    private DriverState.CombinePreference parseCombinePreference(String raw) {
        if (raw == null || raw.isBlank()) {
            return DriverState.CombinePreference.ALLOW;
        }
        String normalized = raw.trim().toUpperCase(Locale.ROOT);
        return switch (normalized) {
            case "DISALLOW" -> DriverState.CombinePreference.DISALLOW;
            case "HOME_ROUTE" -> DriverState.CombinePreference.HOME_ROUTE;
            default -> DriverState.CombinePreference.ALLOW;
        };
    }

    private RouteAssemblyRequest.RouteMode parseRouteMode(String raw) {
        if (raw == null || raw.isBlank()) {
            return RouteAssemblyRequest.RouteMode.SMART;
        }
        String normalized = raw.trim().toUpperCase(Locale.ROOT);
        return "SIMPLE".equals(normalized) ? RouteAssemblyRequest.RouteMode.SIMPLE : RouteAssemblyRequest.RouteMode.SMART;
    }

    private RouteAssemblyResponse applyMaxVisitCountLimit(RouteAssemblyResponse response, Integer maxVisitCount) {
        if (response == null || maxVisitCount == null || maxVisitCount <= 0 || !response.hasRecommendations()) {
            return response;
        }

        List<RecommendedRoute> filtered = response.recommendations().stream()
                .filter(route -> countVisitPoints(route) <= maxVisitCount)
                .toList();

        if (filtered.size() == response.recommendations().size()) {
            return response;
        }

        List<RecommendedRoute> reranked = reRankRoutes(filtered);
        String baseMessage = response.message() == null ? "" : response.message();
        String suffix = String.format(" 방문지 제한(%d)으로 %d개 추천이 제외되었습니다.",
                maxVisitCount,
                response.recommendations().size() - filtered.size());

        return new RouteAssemblyResponse(
                response.success(),
                (baseMessage + suffix).trim(),
                reranked,
                response.totalCandidates(),
                response.filteredCandidates(),
                response.combinationsEvaluated(),
                response.processingTimeMs()
        );
    }

    private int countVisitPoints(RecommendedRoute route) {
        if (route == null) {
            return 0;
        }
        if (route.visitOrder() != null && !route.visitOrder().isEmpty()) {
            return (int) route.visitOrder().stream()
                    .filter(visit -> visit != null && visit.type() != CargoVisit.VisitType.PICKUP)
                    .count();
        }
        return route.quoteIds() == null ? 0 : route.quoteIds().size();
    }

    private List<RecommendedRoute> reRankRoutes(List<RecommendedRoute> routes) {
        if (routes == null || routes.isEmpty()) {
            return List.of();
        }
        List<RecommendedRoute> ranked = new ArrayList<>(routes.size());
        for (int i = 0; i < routes.size(); i++) {
            RecommendedRoute route = routes.get(i);
            ranked.add(new RecommendedRoute(
                    i + 1,
                    route.quoteIds(),
                    route.visitOrder(),
                    route.routeType(),
                    route.estimatedTotalDistanceM(),
                    route.estimatedTotalTimeS(),
                    route.emptyRunDistanceM(),
                    route.routeDeviationM(),
                    route.totalRevenue(),
                    route.estimatedCost(),
                    route.estimatedProfit(),
                    route.profitPerKm(),
                    route.totalCbm(),
                    route.totalWeight(),
                    route.cbmUtilization(),
                    route.weightUtilization(),
                    route.finalScore(),
                    route.scoreBreakdown(),
                    route.scheduleViolations(),
                    route.calibrationId()
            ));
        }
        return ranked;
    }
}
