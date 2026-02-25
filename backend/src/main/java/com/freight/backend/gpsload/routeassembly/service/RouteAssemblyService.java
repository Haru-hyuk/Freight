package com.freight.backend.gpsmiss.routeassembly.service;

import com.freight.backend.entity.QuoteItem;
import com.freight.backend.gpsmiss.loadplan.entity.TruckDimension;
import com.freight.backend.gpsmiss.loadplan.model.CargoHandling;
import com.freight.backend.gpsmiss.loadplan.model.CargoItem;
import com.freight.backend.gpsmiss.loadplan.model.LoadPlanRequest;
import com.freight.backend.gpsmiss.loadplan.model.LoadPlanResponse;
import com.freight.backend.gpsmiss.loadplan.model.Truck;
import com.freight.backend.gpsmiss.loadplan.repository.TruckDimensionRepository;
import com.freight.backend.gpsmiss.loadplan.service.LoadPlanService;
import com.freight.backend.gpsmiss.routeassembly.model.AssemblyParameters;
import com.freight.backend.gpsmiss.routeassembly.model.CargoVisit;
import com.freight.backend.gpsmiss.routeassembly.model.DriverState;
import com.freight.backend.gpsmiss.routeassembly.model.Quote;
import com.freight.backend.gpsmiss.routeassembly.model.RecommendedRoute;
import com.freight.backend.gpsmiss.routeassembly.model.RouteAssemblyRequest;
import com.freight.backend.gpsmiss.routeassembly.model.RouteAssemblyResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import com.freight.backend.repository.QuoteItemRepository;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;

@Service
public class RouteAssemblyService {

    private static final Logger log = LoggerFactory.getLogger(RouteAssemblyService.class);

    @Value("${route.assembly.top-n-real-distance:10}")
    private int topNForRealDistance;

    // ========== 조합 평가 결과 캐시 ==========
    private static final int COMBINATION_CACHE_SIZE = 2000;
    private static final long COMBINATION_CACHE_TTL_MS = 5 * 60 * 1000; // 5분

    private final Map<String, CachedEvaluationResult> combinationCache =
            java.util.Collections.synchronizedMap(new java.util.LinkedHashMap<>(COMBINATION_CACHE_SIZE, 0.75f, true) {
                @Override
                protected boolean removeEldestEntry(Map.Entry<String, CachedEvaluationResult> eldest) {
                    return size() > COMBINATION_CACHE_SIZE;
                }
            });

    private record CachedEvaluationResult(
            RecommendedRoute route,
            long timestamp
    ) {
        boolean isExpired() {
            return System.currentTimeMillis() - timestamp > COMBINATION_CACHE_TTL_MS;
        }
    }

    private final CandidateFilterService candidateFilterService;
    private final CombinationGeneratorService combinationGeneratorService;
    private final RouteSimulationService routeSimulationService;
    private final ScoringService scoringService;
    private final LoadPlanService loadPlanService;
    private final TruckDimensionRepository truckDimensionRepository;
    private final QuoteItemRepository quoteItemRepository;
    private final RouteScoringCalibrationService routeScoringCalibrationService;

    public RouteAssemblyService(
            CandidateFilterService candidateFilterService,
            CombinationGeneratorService combinationGeneratorService,
            RouteSimulationService routeSimulationService,
            ScoringService scoringService,
            LoadPlanService loadPlanService,
            TruckDimensionRepository truckDimensionRepository,
            QuoteItemRepository quoteItemRepository,
            RouteScoringCalibrationService routeScoringCalibrationService
    ) {
        this.candidateFilterService = candidateFilterService;
        this.combinationGeneratorService = combinationGeneratorService;
        this.routeSimulationService = routeSimulationService;
        this.scoringService = scoringService;
        this.loadPlanService = loadPlanService;
        this.truckDimensionRepository = truckDimensionRepository;
        this.quoteItemRepository = quoteItemRepository;
        this.routeScoringCalibrationService = routeScoringCalibrationService;
    }

    public RouteAssemblyResponse recommend(RouteAssemblyRequest request) {
        long startTime = System.currentTimeMillis();

        if (!request.isValid()) {
            return RouteAssemblyResponse.failure("유효하지 않은 요청: 기사 상태와 현재 위치가 필요합니다.");
        }

        if (request.getEffectiveMode() == RouteAssemblyRequest.RouteMode.SIMPLE) {
            return recommendSimpleMode(request, startTime);
        }

        DriverState driverState = request.driverState();
        AssemblyParameters params = request.getEffectiveParameters();
        int totalCandidates = request.hasCandidateQuotes() ? request.candidateQuotes().size() : 0;

        if (!request.hasCandidateQuotes()) {
            return RouteAssemblyResponse.empty("후보 견적이 없습니다.", 0);
        }

        List<Quote> filteredCandidates = candidateFilterService.filterCandidates(
                driverState, request.candidateQuotes(), params
        );
        filteredCandidates = applyTruckDimensionFilter(driverState, filteredCandidates);
        final List<Quote> filteredCandidatesForLookup = filteredCandidates;
        if (filteredCandidates.isEmpty()) {
            return RouteAssemblyResponse.empty(
                    "필터 조건을 만족하는 견적이 없습니다. (반경, 용량, 시간, 차량 치수 조건 확인 필요)",
                    totalCandidates
            );
        }

        List<List<Quote>> combinations = combinationGeneratorService.generateCombinations(
                driverState, filteredCandidates, params
        );
        if (combinations.isEmpty()) {
            return RouteAssemblyResponse.empty("생성 가능한 조합이 없습니다.", totalCandidates);
        }

        // 병렬 처리로 조합 평가 (성능 최적화)
        final DriverState finalDriverState = driverState;
        final AssemblyParameters finalParams = params;

        List<RecommendedRoute> evaluatedRoutes = combinations.parallelStream()
                .map(combination -> {
                    try {
                        return evaluateCombinationFast(finalDriverState, combination, finalParams);
                    } catch (Exception e) {
                        log.warn("조합 평가 실패: {}", e.getMessage());
                        return null;
                    }
                })
                .filter(route -> route != null)
                .collect(java.util.stream.Collectors.toCollection(ArrayList::new));

        if (evaluatedRoutes.isEmpty()) {
            return RouteAssemblyResponse.empty("평가 가능한 조합이 없습니다.", totalCandidates);
        }

        evaluatedRoutes.sort(this::compareRecommendedRoutes);

        int topN = Math.min(resolveTopNForRealDistance(), evaluatedRoutes.size());
        List<RecommendedRoute> refinedRoutes = new ArrayList<>();

        for (int i = 0; i < topN; i++) {
            RecommendedRoute fastRoute = evaluatedRoutes.get(i);
            List<Quote> quotes = fastRoute.quoteIds().stream()
                    .map(id -> findQuoteById(filteredCandidatesForLookup, id))
                    .filter(q -> q != null)
                    .toList();

            try {
                RecommendedRoute realRoute = evaluateCombination(driverState, quotes, params);
                if (realRoute == null) {
                    continue;
                }

                // 양방향 최적화: 3D 적재 검증 및 순서 재조정
                LoadOptimizationResult loadOptResult = optimizeWithLoadPlan(realRoute, quotes, driverState, params);

                if (loadOptResult.overflow() && !loadOptResult.reorderedRoute().isPresent()) {
                    log.info("추천 #{} 3D 오버플로우 감지 - 배치불가 {}건, 순서 재조정 실패, 제외",
                            i + 1, loadOptResult.unplacedCount());
                    continue;
                }

                // 재조정된 경로가 있으면 사용
                RecommendedRoute finalRoute = loadOptResult.reorderedRoute().orElse(realRoute);

                if (finalRoute.scheduleViolations() > 0) {
                    log.info("추천 #{} 운송일정 위반 {}건, 제외", i + 1, finalRoute.scheduleViolations());
                    continue;
                }

                // 적재 효율을 점수에 반영한 최종 경로
                RecommendedRoute scoredRoute = applyLoadEfficiencyBonus(finalRoute, loadOptResult.utilization());
                refinedRoutes.add(scoredRoute);

            } catch (Exception e) {
                log.warn("실제 거리 계산 실패, Haversine 결과 사용: {}", e.getMessage());
                refinedRoutes.add(fastRoute);
            }
        }

        refinedRoutes.sort(this::compareRecommendedRoutes);

        List<RecommendedRoute> topRecommendations = refinedRoutes.stream()
                .limit(params.maxRecommendations())
                .toList();

        List<RecommendedRoute> rankedRecommendations = new ArrayList<>();
        for (int i = 0; i < topRecommendations.size(); i++) {
            RecommendedRoute original = topRecommendations.get(i);
            rankedRecommendations.add(new RecommendedRoute(
                    i + 1,
                    original.quoteIds(),
                    original.visitOrder(),
                    original.routeType(),
                    original.estimatedTotalDistanceM(),
                    original.estimatedTotalTimeS(),
                    original.emptyRunDistanceM(),
                    original.routeDeviationM(),
                    original.totalRevenue(),
                    original.estimatedCost(),
                    original.estimatedProfit(),
                    original.profitPerKm(),
                    original.totalCbm(),
                    original.totalWeight(),
                    original.cbmUtilization(),
                    original.weightUtilization(),
                    original.finalScore(),
                    original.scoreBreakdown(),
                    original.scheduleViolations(),
                    original.calibrationId()
            ));
        }

        rankedRecommendations = routeScoringCalibrationService.attachCalibrationIds(rankedRecommendations);

        long processingTime = System.currentTimeMillis() - startTime;
        return RouteAssemblyResponse.success(
                rankedRecommendations,
                totalCandidates,
                filteredCandidates.size(),
                combinations.size(),
                processingTime
        );
    }

    private int resolveTopNForRealDistance() {
        if (topNForRealDistance < 1) {
            return 1;
        }
        return Math.min(topNForRealDistance, 100);
    }

    private int compareRecommendedRoutes(RecommendedRoute a, RecommendedRoute b) {
        if (a.scheduleViolations() != b.scheduleViolations()) {
            return Integer.compare(a.scheduleViolations(), b.scheduleViolations());
        }

        int scoreCompare = Double.compare(b.finalScore(), a.finalScore());
        if (scoreCompare != 0) {
            return scoreCompare;
        }

        int profitCompare = Double.compare(b.estimatedProfit(), a.estimatedProfit());
        if (profitCompare != 0) {
            return profitCompare;
        }

        int emptyRunCompare = Integer.compare(a.emptyRunDistanceM(), b.emptyRunDistanceM());
        if (emptyRunCompare != 0) {
            return emptyRunCompare;
        }

        return Integer.compare(a.estimatedTotalDistanceM(), b.estimatedTotalDistanceM());
    }

    private Quote findQuoteById(List<Quote> quotes, Long quoteId) {
        return quotes.stream()
                .filter(q -> q.quoteId().equals(quoteId))
                .findFirst()
                .orElse(null);
    }

    private RecommendedRoute evaluateCombinationFast(
            DriverState driverState,
            List<Quote> quotes,
            AssemblyParameters params
    ) {
        // 캐시 키 생성: driverState 위치 + quote ID 조합
        String cacheKey = buildCombinationCacheKey(driverState, quotes);

        // 캐시 조회
        CachedEvaluationResult cached = combinationCache.get(cacheKey);
        if (cached != null && !cached.isExpired()) {
            log.trace("조합 평가 캐시 HIT: {}", cacheKey);
            return cached.route();
        }

        // 캐시 미스: 실제 평가 수행
        RouteSimulationService.SimulationResult simulation = routeSimulationService.simulateFast(driverState, quotes);
        if (!simulation.success()) {
            return null;
        }

        RecommendedRoute route = buildRecommendedRoute(driverState, quotes, simulation, params);

        // 캐시 저장
        if (route != null) {
            combinationCache.put(cacheKey, new CachedEvaluationResult(route, System.currentTimeMillis()));
        }

        return route;
    }

    /**
     * 조합 캐시 키 생성
     * 형식: "lat,lng|quoteId1,quoteId2,..." (정렬됨)
     */
    private String buildCombinationCacheKey(DriverState driverState, List<Quote> quotes) {
        String locationKey = String.format("%.4f,%.4f",
                driverState.currentLocation().latitude(),
                driverState.currentLocation().longitude());

        String quoteIds = quotes.stream()
                .map(Quote::quoteId)
                .sorted()
                .map(String::valueOf)
                .collect(java.util.stream.Collectors.joining(","));

        return locationKey + "|" + quoteIds;
    }

    private RecommendedRoute evaluateCombination(
            DriverState driverState,
            List<Quote> quotes,
            AssemblyParameters params
    ) {
        RouteSimulationService.SimulationResult simulation = routeSimulationService.simulate(driverState, quotes);
        if (!simulation.success()) {
            return null;
        }
        return buildRecommendedRoute(driverState, quotes, simulation, params);
    }

    private RecommendedRoute buildRecommendedRoute(
            DriverState driverState,
            List<Quote> quotes,
            RouteSimulationService.SimulationResult simulation,
            AssemblyParameters params
    ) {
        ScoringService.ScoringResult scoring = scoringService.calculateScore(driverState, quotes, simulation, params);
        RecommendedRoute.RouteType routeType = scoringService.determineRouteType(driverState, quotes);

        double totalCbm = combinationGeneratorService.totalCbm(quotes);
        double totalWeight = combinationGeneratorService.totalWeight(quotes);
        double totalRevenue = combinationGeneratorService.totalRevenue(quotes);

        double cbmUtilization = scoringService.calculateCbmUtilization(driverState, quotes);
        double weightUtilization = scoringService.calculateWeightUtilization(driverState, quotes);

        double estimatedCost = calculateEstimatedCost(simulation, params);

        return new RecommendedRoute(
                0,
                quotes.stream().map(Quote::quoteId).toList(),
                simulation.visitOrder(),
                routeType,
                simulation.totalDistanceM(),
                simulation.totalDurationS(),
                simulation.emptyRunDistanceM(),
                simulation.routeDeviationM(),
                totalRevenue,
                estimatedCost,
                scoring.estimatedProfit(),
                scoring.profitPerKm(),
                totalCbm,
                totalWeight,
                cbmUtilization,
                weightUtilization,
                scoring.finalScore(),
                scoring.breakdown(),
                simulation.scheduleViolations(),
                null
        );
    }

    private OverflowCheckResult checkOverflow(RecommendedRoute route, List<Quote> quotes, DriverState driverState) {
        OverflowCheckResultWithUnplacedIds result = checkOverflowWithUnplacedIds(route, quotes, driverState);
        return new OverflowCheckResult(
                result.overflow(),
                result.placedCount(),
                result.unplacedCount(),
                result.utilization()
        );
    }

    /**
     * 오버플로우 검사 + 배치 실패한 Quote ID 반환
     */
    private OverflowCheckResultWithUnplacedIds checkOverflowWithUnplacedIds(
            RecommendedRoute route, List<Quote> quotes, DriverState driverState) {
        try {
            List<CargoItem> cargoItems = new ArrayList<>();
            Map<Long, Integer> stopOrderByQuoteId = buildDeliveryStopOrder(route);
            Map<String, Long> cargoIdToQuoteId = new HashMap<>(); // 화물ID → QuoteID 매핑

            for (Quote q : quotes) {
                int stopOrder = stopOrderByQuoteId.getOrDefault(q.quoteId(), 1);
                List<QuoteItem> quoteItems = q.quoteId() != null
                        ? quoteItemRepository.findByQuoteId(q.quoteId())
                        : List.of();

                if (quoteItems != null && !quoteItems.isEmpty()) {
                    quoteItems = quoteItems.stream()
                            .sorted(Comparator.comparingInt(qi -> qi.getSortOrder() == null ? 0 : qi.getSortOrder()))
                            .toList();
                    for (QuoteItem qi : quoteItems) {
                        int quantity = qi.getQuantity() == null || qi.getQuantity() <= 0 ? 1 : qi.getQuantity();
                        for (int unit = 1; unit <= quantity; unit++) {
                            CargoItem cargoItem = toCargoItem(q, qi, stopOrder, unit);
                            cargoItems.add(cargoItem);
                            cargoIdToQuoteId.put(cargoItem.id(), q.quoteId());
                        }
                    }
                } else {
                    CargoItem cargoItem = toCargoItem(q, null, stopOrder, 1);
                    cargoItems.add(cargoItem);
                    cargoIdToQuoteId.put(cargoItem.id(), q.quoteId());
                }
            }

            Truck truck = resolveTruck(driverState);
            LoadPlanRequest loadRequest = new LoadPlanRequest(truck, cargoItems);
            LoadPlanResponse loadResult = loadPlanService.plan(loadRequest);

            int unplacedCount = loadResult.stats().unplacedCount();
            boolean overflow = unplacedCount > 0;

            // 배치 실패한 화물의 Quote ID 추출 (중복 제거)
            Set<Long> unplacedQuoteIdSet = new LinkedHashSet<>();
            if (loadResult.unplaced() != null) {
                for (CargoItem unplacedCargo : loadResult.unplaced()) {
                    Long quoteId = cargoIdToQuoteId.get(unplacedCargo.id());
                    if (quoteId != null) {
                        unplacedQuoteIdSet.add(quoteId);
                    }
                }
            }

            return new OverflowCheckResultWithUnplacedIds(
                    overflow,
                    loadResult.stats().placedCount(),
                    unplacedCount,
                    loadResult.stats().utilization(),
                    new ArrayList<>(unplacedQuoteIdSet)
            );
        } catch (Exception e) {
            log.warn("3D overflow check failed - fail-closed: {}", e.getMessage(), e);
            return new OverflowCheckResultWithUnplacedIds(true, 0, Integer.MAX_VALUE, 0, List.of());
        }
    }

    private Map<Long, Integer> buildDeliveryStopOrder(RecommendedRoute route) {
        Map<Long, Integer> stopOrderByQuoteId = new HashMap<>();
        if (route == null || route.visitOrder() == null) {
            return stopOrderByQuoteId;
        }

        int order = 1;
        for (CargoVisit visit : route.visitOrder()) {
            if (visit.type() == CargoVisit.VisitType.DELIVERY && visit.quoteId() != null) {
                stopOrderByQuoteId.putIfAbsent(visit.quoteId(), order++);
            }
        }
        return stopOrderByQuoteId;
    }

    private CargoItem toCargoItem(Quote q, QuoteItem qi, int stopOrder, int unitSequence) {
        int length = qi != null && qi.getLengthCm() != null ? qi.getLengthCm() : (q.lengthCm() != null ? q.lengthCm() : 100);
        int width = qi != null && qi.getWidthCm() != null ? qi.getWidthCm() : (q.widthCm() != null ? q.widthCm() : 80);
        int height = qi != null && qi.getHeightCm() != null ? qi.getHeightCm() : (q.heightCm() != null ? q.heightCm() : 60);
        double weight = qi != null && qi.getUnitWeightKg() != null ? qi.getUnitWeightKg() : (q.weightKg() != null ? q.weightKg() : 50);

        Set<CargoHandling> handlingSet = new LinkedHashSet<>();
        if (q.handling() != null) {
            handlingSet.addAll(q.handling());
        }
        if (qi != null) {
            if (Boolean.TRUE.equals(qi.getFragile())) {
                handlingSet.add(CargoHandling.FRAGILE);
            }
            if (Boolean.TRUE.equals(qi.getUpright())) {
                handlingSet.add(CargoHandling.UPRIGHT);
            }
            handlingSet.addAll(parseHandlingTags(qi.getHandlingTags()));
        }

        boolean fragileFromHandling = handlingSet.contains(CargoHandling.FRAGILE) || handlingSet.contains(CargoHandling.EASY_BREAK);
        boolean uprightFromHandling = handlingSet.contains(CargoHandling.UPRIGHT);

        boolean noStackFromItem = qi != null && Boolean.TRUE.equals(qi.getNoStack());
        boolean bottomOnlyFromItem = qi != null && Boolean.TRUE.equals(qi.getBottomOnly());
        boolean fragileFromItem = qi != null && Boolean.TRUE.equals(qi.getFragile());

        boolean effectiveNoStack = noStackFromItem || Boolean.TRUE.equals(q.noStack()) || Boolean.FALSE.equals(q.stackable());
        boolean rotatable = qi != null && qi.getRotatable() != null
                ? qi.getRotatable()
                : (q.rotatable() != null ? q.rotatable() : !uprightFromHandling);
        boolean stackable = qi != null && qi.getStackable() != null
                ? qi.getStackable()
                : (q.stackable() != null ? q.stackable() : !effectiveNoStack);
        boolean fragile = fragileFromItem || (q.fragile() != null ? q.fragile() : fragileFromHandling);
        boolean noStack = effectiveNoStack || !stackable;
        boolean bottomOnly = bottomOnlyFromItem || Boolean.TRUE.equals(q.bottomOnly());
        Double maxStackWeight = qi != null && qi.getMaxStackWeightKg() != null ? qi.getMaxStackWeightKg() : q.maxStackWeight();

        String cargoId = qi != null && qi.getQuoteItemId() != null
                ? ("Q" + q.quoteId() + "-I" + qi.getQuoteItemId() + "-N" + unitSequence)
                : ("Q" + q.quoteId() + "-N" + unitSequence);

        return new CargoItem(
                cargoId,
                length, width, height, weight,
                stopOrder,
                rotatable,
                stackable,
                fragile,
                noStack,
                bottomOnly,
                maxStackWeight,
                new ArrayList<>(handlingSet)
        );
    }

    private List<CargoHandling> parseHandlingTags(String handlingTags) {
        if (handlingTags == null || handlingTags.isBlank()) {
            return List.of();
        }
        List<CargoHandling> parsed = new ArrayList<>();
        String[] tokens = handlingTags.split("[,;|]");
        for (String token : tokens) {
            if (token == null || token.isBlank()) {
                continue;
            }
            String normalized = token.trim().toUpperCase().replace('-', '_').replace(' ', '_');
            switch (normalized) {
                case "FRAGILE", "BREAKABLE", "HANDLE_WITH_CARE" -> parsed.add(CargoHandling.FRAGILE);
                case "EASY_BREAK", "SHOCK_SENSITIVE" -> parsed.add(CargoHandling.EASY_BREAK);
                case "UPRIGHT", "THIS_SIDE_UP" -> parsed.add(CargoHandling.UPRIGHT);
                case "KEEP_DRY", "DRY", "WATERPROOF" -> parsed.add(CargoHandling.KEEP_DRY);
                default -> {
                    // ignore unknown tags
                }
            }
        }
        return parsed;
    }

    private Truck resolveTruck(DriverState driverState) {
        if (driverState.truckId() != null) {
            Optional<TruckDimension> dims = truckDimensionRepository.findById(driverState.truckId());
            if (dims.isPresent()) {
                TruckDimension d = dims.get();
                int length = d.getLength() != null ? d.getLength() : 600;
                int width = d.getWidth() != null ? d.getWidth() : 220;
                int height = d.getHeight() != null ? d.getHeight() : 200;
                double maxWeight = d.getMaxWeightKg() != null ? d.getMaxWeightKg()
                        : (driverState.remainingWeight() != null ? driverState.remainingWeight() : 5000);
                String doorPosition = d.getDoorPosition();
                return new Truck(d.getTruckId(), length, width, height, maxWeight, doorPosition);
            }
        }

        return new Truck(
                null,
                600,
                220,
                200,
                driverState.remainingWeight() != null ? driverState.remainingWeight() : 5000,
                "rear"
        );
    }

    public record OverflowCheckResult(
            boolean overflow,
            int placedCount,
            int unplacedCount,
            double utilization
    ) {}

    /**
     * 오버플로우 검사 결과 + 배치 실패한 Quote ID 목록
     */
    public record OverflowCheckResultWithUnplacedIds(
            boolean overflow,
            int placedCount,
            int unplacedCount,
            double utilization,
            List<Long> unplacedQuoteIds
    ) {}

    /**
     * 양방향 최적화 결과
     */
    public record LoadOptimizationResult(
            boolean overflow,
            int placedCount,
            int unplacedCount,
            double utilization,
            java.util.Optional<RecommendedRoute> reorderedRoute
    ) {}

    /**
     * 양방향 최적화: 3D 적재 검증 + 순서 재조정 + 부분 적재 지원
     * 1. 현재 순서로 적재 검증
     * 2. 오버플로우 시 최대 3가지 다른 순서 시도
     * 3. 순서 재조정 실패 시 적재 불가 화물만 제외하고 재조합
     * 4. 가장 효율 좋은 순서 선택
     */
    private LoadOptimizationResult optimizeWithLoadPlan(
            RecommendedRoute route,
            List<Quote> quotes,
            DriverState driverState,
            AssemblyParameters params
    ) {
        // 1. 현재 순서로 적재 검증
        OverflowCheckResultWithUnplacedIds initialCheck = checkOverflowWithUnplacedIds(route, quotes, driverState);

        if (!initialCheck.overflow()) {
            // 적재 가능하면 그대로 반환
            return new LoadOptimizationResult(
                    false,
                    initialCheck.placedCount(),
                    initialCheck.unplacedCount(),
                    initialCheck.utilization(),
                    java.util.Optional.empty()
            );
        }

        // 2. 다건 조합일 때만 순서 재조정 시도
        if (quotes.size() < 2) {
            return new LoadOptimizationResult(
                    true,
                    initialCheck.placedCount(),
                    initialCheck.unplacedCount(),
                    initialCheck.utilization(),
                    java.util.Optional.empty()
            );
        }

        log.info("3D 오버플로우 감지, 순서 재조정 시도 (quotes={})", quotes.size());

        // 3. 여러 순서 시도
        RecommendedRoute bestRoute = null;
        double bestUtilization = 0.0;
        int bestUnplaced = Integer.MAX_VALUE;

        // 최대 3가지 순서 시도 (원본 + 2개 변형)
        List<List<Quote>> orderVariants = generateDeliveryOrderVariants(quotes);

        for (List<Quote> orderedQuotes : orderVariants) {
            try {
                RecommendedRoute reorderedRoute = evaluateCombinationWithOrder(driverState, orderedQuotes, params);
                if (reorderedRoute == null) {
                    continue;
                }

                OverflowCheckResultWithUnplacedIds check = checkOverflowWithUnplacedIds(reorderedRoute, orderedQuotes, driverState);

                // 더 나은 결과 선택 (unplaced 적고, utilization 높은)
                if (check.unplacedCount() < bestUnplaced ||
                        (check.unplacedCount() == bestUnplaced && check.utilization() > bestUtilization)) {

                    if (!check.overflow()) {
                        bestRoute = reorderedRoute;
                        bestUtilization = check.utilization();
                        bestUnplaced = check.unplacedCount();
                        log.info("순서 재조정 성공: utilization={}%, unplaced={}",
                                String.format("%.1f", check.utilization() * 100), check.unplacedCount());
                        break; // 적재 가능한 순서 찾음
                    }
                }
            } catch (Exception e) {
                log.debug("순서 재조정 실패: {}", e.getMessage());
            }
        }

        if (bestRoute != null) {
            return new LoadOptimizationResult(
                    false,
                    (int) (bestUtilization * 100), // 근사치
                    bestUnplaced,
                    bestUtilization,
                    java.util.Optional.of(bestRoute)
            );
        }

        // 4. 부분 적재 지원: 적재 불가 화물만 제외하고 재조합 시도
        if (initialCheck.unplacedQuoteIds() != null && !initialCheck.unplacedQuoteIds().isEmpty()
                && quotes.size() > initialCheck.unplacedQuoteIds().size()) {

            Set<Long> unplacedSet = new java.util.HashSet<>(initialCheck.unplacedQuoteIds());
            List<Quote> reducedQuotes = quotes.stream()
                    .filter(q -> !unplacedSet.contains(q.quoteId()))
                    .toList();

            if (!reducedQuotes.isEmpty() && reducedQuotes.size() < quotes.size()) {
                log.info("부분 적재 시도: {}건 중 {}건 제외, 남은 {}건으로 재평가",
                        quotes.size(), unplacedSet.size(), reducedQuotes.size());

                try {
                    RecommendedRoute reducedRoute = evaluateCombinationWithOrder(driverState, reducedQuotes, params);
                    if (reducedRoute != null) {
                        OverflowCheckResultWithUnplacedIds reducedCheck =
                                checkOverflowWithUnplacedIds(reducedRoute, reducedQuotes, driverState);

                        if (!reducedCheck.overflow()) {
                            log.info("부분 적재 성공: utilization={}%, 제외된 화물={}",
                                    String.format("%.1f", reducedCheck.utilization() * 100),
                                    unplacedSet);
                            return new LoadOptimizationResult(
                                    false,
                                    reducedCheck.placedCount(),
                                    reducedCheck.unplacedCount(),
                                    reducedCheck.utilization(),
                                    java.util.Optional.of(reducedRoute)
                            );
                        }
                    }
                } catch (Exception e) {
                    log.debug("부분 적재 재평가 실패: {}", e.getMessage());
                }
            }
        }

        return new LoadOptimizationResult(
                true,
                initialCheck.placedCount(),
                initialCheck.unplacedCount(),
                initialCheck.utilization(),
                java.util.Optional.empty()
        );
    }

    /**
     * 배송 순서 변형 생성 (LIFO 최적화를 위해)
     */
    private List<List<Quote>> generateDeliveryOrderVariants(List<Quote> quotes) {
        List<List<Quote>> variants = new ArrayList<>();
        variants.add(quotes); // 원본 순서

        if (quotes.size() <= 1) {
            return variants;
        }

        // 변형 1: 거리 기준 정렬 (가까운 것부터)
        List<Quote> byDistance = new ArrayList<>(quotes);
        byDistance.sort(Comparator.comparingDouble(q ->
                q.origin() != null && q.destination() != null
                        ? haversineKm(q.origin().latitude(), q.origin().longitude(),
                        q.destination().latitude(), q.destination().longitude())
                        : 0.0
        ));
        variants.add(byDistance);

        // 변형 2: 부피 기준 정렬 (큰 것부터 - 안쪽 배치)
        List<Quote> byVolume = new ArrayList<>(quotes);
        byVolume.sort(Comparator.comparingDouble((Quote q) ->
                q.volumeCbm() != null ? q.volumeCbm() : 0.0
        ).reversed());
        variants.add(byVolume);

        return variants;
    }

    /**
     * 지정된 순서로 경로 평가
     */
    private RecommendedRoute evaluateCombinationWithOrder(
            DriverState driverState,
            List<Quote> orderedQuotes,
            AssemblyParameters params
    ) {
        RouteSimulationService.SimulationResult simulation =
                routeSimulationService.simulateWithFixedOrder(driverState, orderedQuotes);
        if (!simulation.success()) {
            return null;
        }
        return buildRecommendedRoute(driverState, orderedQuotes, simulation, params);
    }

    /**
     * 적재 효율 보너스를 점수에 반영
     */
    private RecommendedRoute applyLoadEfficiencyBonus(RecommendedRoute route, double utilization) {
        // 적재 효율 80% 이상이면 보너스
        double loadBonus = utilization >= 0.8 ? 5.0 : (utilization >= 0.6 ? 2.0 : 0.0);
        double adjustedScore = route.finalScore() + loadBonus;

        return new RecommendedRoute(
                route.rank(),
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
                adjustedScore,
                route.scoreBreakdown(),
                route.scheduleViolations(),
                route.calibrationId()
        );
    }

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

    private double calculateEstimatedCost(
            RouteSimulationService.SimulationResult simulation,
            AssemblyParameters params
    ) {
        double distanceKm = simulation.totalDistanceM() / 1000.0;
        double durationHours = simulation.totalDurationS() / 3600.0;

        double fuelCost = distanceKm * params.fuelCostPerKm();
        double timeCost = durationHours * params.baseHourlyCost();

        return fuelCost + timeCost;
    }

    private RouteAssemblyResponse recommendSimpleMode(RouteAssemblyRequest request, long startTime) {
        DriverState driverState = request.driverState();
        AssemblyParameters params = request.getEffectiveParameters();
        int totalCandidates = request.hasCandidateQuotes() ? request.candidateQuotes().size() : 0;

        if (!request.hasCandidateQuotes()) {
            return RouteAssemblyResponse.empty("후보 견적이 없습니다.", 0);
        }

        List<Quote> filtered = candidateFilterService.filterCandidates(
                driverState, request.candidateQuotes(), params
        );
        filtered = applyTruckDimensionFilter(driverState, filtered);
        if (filtered.isEmpty()) {
            return RouteAssemblyResponse.empty("필터 조건을 만족하는 견적이 없습니다.", totalCandidates);
        }

        List<Quote> sortedFiltered = new ArrayList<>(filtered);
        sortedFiltered.sort(Comparator.comparingDouble(q -> {
            double toPickup = candidateFilterService.haversineDistance(
                    driverState.currentLocation().latitude(),
                    driverState.currentLocation().longitude(),
                    q.origin().latitude(),
                    q.origin().longitude()
            );
            double pickupToDelivery = candidateFilterService.haversineDistance(
                    q.origin().latitude(),
                    q.origin().longitude(),
                    q.destination().latitude(),
                    q.destination().longitude()
            );
            return toPickup + pickupToDelivery;
        }));

        List<RecommendedRoute> routes = new ArrayList<>();
        for (Quote quote : sortedFiltered) {
            try {
                RouteSimulationService.SimulationResult sim =
                        routeSimulationService.simulateFast(driverState, List.of(quote));

                if (sim.success()) {
                    RecommendedRoute route = buildRecommendedRoute(driverState, List.of(quote), sim, params);
                    if (route != null) {
                        OverflowCheckResult overflowCheck = checkOverflow(route, List.of(quote), driverState);
                        if (overflowCheck.overflow()) {
                            log.info("SIMPLE 추천 제외: 3D 오버플로우 감지 (quoteId={}, unplaced={})",
                                    quote.quoteId(), overflowCheck.unplacedCount());
                            continue;
                        }

                        routes.add(route);
                    }
                }
            } catch (Exception e) {
                log.warn("SIMPLE mode quote evaluation failed (quoteId={}): {}", quote.quoteId(), e.getMessage());
            }
        }

        if (routes.isEmpty()) {
            return RouteAssemblyResponse.empty("평가 가능한 견적이 없습니다.", totalCandidates);
        }

        routes.sort(this::compareRecommendedRoutes);
        List<RecommendedRoute> ranked = new ArrayList<>();
        int limit = Math.min(params.maxRecommendations(), routes.size());

        for (int i = 0; i < limit; i++) {
            RecommendedRoute r = routes.get(i);
            ranked.add(new RecommendedRoute(
                    i + 1,
                    r.quoteIds(),
                    r.visitOrder(),
                    r.routeType(),
                    r.estimatedTotalDistanceM(),
                    r.estimatedTotalTimeS(),
                    r.emptyRunDistanceM(),
                    r.routeDeviationM(),
                    r.totalRevenue(),
                    r.estimatedCost(),
                    r.estimatedProfit(),
                    r.profitPerKm(),
                    r.totalCbm(),
                    r.totalWeight(),
                    r.cbmUtilization(),
                    r.weightUtilization(),
                    r.finalScore(),
                    r.scoreBreakdown(),
                    r.scheduleViolations(),
                    r.calibrationId()
            ));
        }

        ranked = routeScoringCalibrationService.attachCalibrationIds(ranked);

        long processingTime = System.currentTimeMillis() - startTime;
        return RouteAssemblyResponse.success(
                ranked,
                totalCandidates,
                filtered.size(),
                filtered.size(),
                processingTime
        );
    }

    public RouteAssemblyResponse evaluateSelectedQuotes(
            DriverState driverState,
            List<Quote> selectedQuotes,
            AssemblyParameters params
    ) {
        long startTime = System.currentTimeMillis();

        if (selectedQuotes == null || selectedQuotes.isEmpty()) {
            return RouteAssemblyResponse.failure("선택한 견적이 없습니다.");
        }

        double totalCbm = combinationGeneratorService.totalCbm(selectedQuotes);
        double totalWeight = combinationGeneratorService.totalWeight(selectedQuotes);

        if (!driverState.canLoad(totalCbm, totalWeight)) {
            return RouteAssemblyResponse.failure(
                    String.format("적재 용량 초과: CBM %.2f (잔여 %.2f), 중량 %.0fkg (잔여 %.0fkg)",
                            totalCbm,
                            driverState.remainingCbm(),
                            totalWeight,
                            driverState.remainingWeight())
            );
        }

        RecommendedRoute route = evaluateCombination(driverState, selectedQuotes, params);
        if (route == null) {
            return RouteAssemblyResponse.failure("선택한 견적의 경로를 계산할 수 없습니다.");
        }

        RecommendedRoute rankedRoute = new RecommendedRoute(
                1,
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
        );

        List<RecommendedRoute> calibrated = routeScoringCalibrationService.attachCalibrationIds(List.of(rankedRoute));

        long processingTime = System.currentTimeMillis() - startTime;
        return RouteAssemblyResponse.success(
                calibrated,
                selectedQuotes.size(),
                selectedQuotes.size(),
                1,
                processingTime
        );
    }

    /**
     * 기사 트럭 치수 대비 화물 개별 치수 초과 여부를 사전 필터링.
     * 치수 정보가 없는 견적은 기존 동작 호환을 위해 통과시킨다.
     */
    private List<Quote> applyTruckDimensionFilter(DriverState driverState, List<Quote> candidates) {
        if (driverState == null || driverState.truckId() == null || candidates == null || candidates.isEmpty()) {
            return candidates;
        }

        Optional<TruckDimension> truckOpt = truckDimensionRepository.findById(driverState.truckId());
        if (truckOpt.isEmpty()) {
            return candidates;
        }

        TruckDimension truck = truckOpt.get();
        Integer truckLength = truck.getLength();
        Integer truckWidth = truck.getWidth();
        Integer truckHeight = truck.getHeight();
        Double truckMaxWeight = truck.getMaxWeightKg();

        List<Quote> filtered = new ArrayList<>();
        for (Quote q : candidates) {
            if (q == null) continue;

            boolean exceedsDimension = false;
            if (q.lengthCm() != null && truckLength != null && q.lengthCm() > truckLength) exceedsDimension = true;
            if (q.widthCm() != null && truckWidth != null && q.widthCm() > truckWidth) exceedsDimension = true;
            if (q.heightCm() != null && truckHeight != null && q.heightCm() > truckHeight) exceedsDimension = true;

            boolean exceedsTruckWeight = q.weightKg() != null && truckMaxWeight != null && q.weightKg() > truckMaxWeight;

            if (!exceedsDimension && !exceedsTruckWeight) {
                filtered.add(q);
            } else {
                log.debug("차량 치수/중량 필터 탈락 - quoteId={}, dims=[{}x{}x{}], weight={}",
                        q.quoteId(), q.lengthCm(), q.widthCm(), q.heightCm(), q.weightKg());
            }
        }

        return filtered;
    }
}
