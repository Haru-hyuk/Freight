package com.freight.backend.gpsmiss.routeassembly.service;

import com.freight.backend.gpsmiss.route.model.Place;
import com.freight.backend.gpsmiss.route.model.RouteRequest;
import com.freight.backend.gpsmiss.route.model.RouteResponse;
import com.freight.backend.gpsmiss.route.service.CachedRouteService;
import com.freight.backend.gpsmiss.route.service.CachedRouteService.RouteDistance;
import com.freight.backend.gpsmiss.route.service.KakaoRouteService;
import com.freight.backend.gpsmiss.routeassembly.model.CargoVisit;
import com.freight.backend.gpsmiss.routeassembly.model.DriverState;
import com.freight.backend.gpsmiss.routeassembly.model.Quote;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Random;
import java.util.Set;
import java.util.stream.Collectors;

@Service
public class RouteSimulationService {

    private static final Logger log = LoggerFactory.getLogger(RouteSimulationService.class);

    private final KakaoRouteService kakaoRouteService;
    private final CandidateFilterService candidateFilterService;
    private final CachedRouteService cachedRouteService;

    private static final double ROAD_COEFFICIENT = 1.3;
    private static final double CLUSTER_RADIUS_M = 500.0;
    private static final int MAX_ADDED_DISTANCE_M = 200;
    private static final double MAX_ADDED_RATIO = 0.005;
    private static final double DELIVERY_SLACK_SWAP_RATIO = 0.02;
    private static final int TWO_OPT_MAX_ITERATIONS = 100;
    private static final int PICKUP_HANDLING_SECONDS = 20 * 60;
    private static final int ALNS_MAX_ITERATIONS = 36;
    private static final int ALNS_REMOVE_MIN = 1;
    private static final int ALNS_REMOVE_MAX = 2;
    private static final int MATHEURISTIC_MAX_QUOTES = 6;
    private static final int MATHEURISTIC_MAX_STATES = 200_000;

    // ========== 시간대별 속도 모델 ==========
    private static final double SPEED_BASE_KMH = 40.0;           // 기본 속도
    private static final double SPEED_RUSH_HOUR_KMH = 20.0;      // 출퇴근 시간
    private static final double SPEED_NIGHT_KMH = 50.0;          // 야간 (23시-5시)
    private static final double SPEED_WEEKEND_BONUS_KMH = 5.0;   // 주말 보너스

    public RouteSimulationService(
            KakaoRouteService kakaoRouteService,
            CandidateFilterService candidateFilterService,
            CachedRouteService cachedRouteService
    ) {
        this.kakaoRouteService = kakaoRouteService;
        this.candidateFilterService = candidateFilterService;
        this.cachedRouteService = cachedRouteService;
    }

    public record SimulationResult(
            List<CargoVisit> visitOrder,
            int totalDistanceM,
            int totalDurationS,
            int emptyRunDistanceM,
            int routeDeviationM,
            int scheduleViolations,
            boolean success,
            String errorMessage
    ) {
        public static SimulationResult failure(String message) {
            return new SimulationResult(List.of(), 0, 0, 0, 0, 0, false, message);
        }
    }

    public SimulationResult simulate(DriverState driverState, List<Quote> quotes) {
        try {
            List<CargoVisit> visitOrder = optimizeVisitOrderWithHaversine(driverState, quotes);
            if (visitOrder.isEmpty()) {
                return SimulationResult.failure("No visit order");
            }

            Place start = driverState.currentLocation();
            int totalDistanceM = 0;
            int totalDurationS = 0;

            Place first = visitOrder.get(0).location();
            RouteDistance emptyRun = cachedRouteService.getDistance(start, first);
            int emptyRunDistanceM = emptyRun.distanceM();
            totalDistanceM += emptyRun.distanceM();
            totalDurationS += emptyRun.durationS();

            Place prev = first;
            for (int i = 1; i < visitOrder.size(); i++) {
                Place next = visitOrder.get(i).location();
                RouteDistance seg = cachedRouteService.getDistance(prev, next);
                totalDistanceM += seg.distanceM();
                totalDurationS += seg.durationS();
                prev = next;
            }

            int routeDeviationM = 0;
            if (driverState.endLocation() != null) {
                routeDeviationM = calculateRouteDeviationReal(
                        start,
                        driverState.endLocation(),
                        visitOrder
                );
            }

            List<CargoVisit> enriched = enrichVisitOrderReal(visitOrder, start);
            int scheduleViolations = checkScheduleViolations(
                    enriched, quotes, driverState, start, totalDurationS
            );

            return new SimulationResult(
                    enriched,
                    totalDistanceM,
                    totalDurationS,
                    emptyRunDistanceM,
                    routeDeviationM,
                    scheduleViolations,
                    true,
                    null
            );
        } catch (Exception e) {
            log.error("Route simulation failed", e);
            return SimulationResult.failure("Route simulation error: " + e.getMessage());
        }
    }

    public SimulationResult simulateFast(DriverState driverState, List<Quote> quotes) {
        try {
            List<CargoVisit> visitOrder = optimizeVisitOrderWithHaversine(driverState, quotes);
            if (visitOrder.isEmpty()) {
                return SimulationResult.failure("No visit order");
            }

            Place start = driverState.currentLocation();
            Place first = visitOrder.get(0).location();

            int emptyRunDistanceM = haversineDistanceM(start, first);
            int totalDistanceM = emptyRunDistanceM;

            Place prev = first;
            for (int i = 1; i < visitOrder.size(); i++) {
                Place next = visitOrder.get(i).location();
                totalDistanceM += haversineDistanceM(prev, next);
                prev = next;
            }

            // 시간대별 속도 모델 적용
            LocalDateTime departureTime = resolveScheduleValidationStartTime(driverState);
            int totalDurationS = calculateDurationWithTimeModel(totalDistanceM, departureTime);
            int routeDeviationM = 0;
            if (driverState.endLocation() != null) {
                routeDeviationM = calculateRouteDeviationHaversine(
                        start,
                        driverState.endLocation(),
                        visitOrder
                );
            }

            int scheduleViolations = checkScheduleViolations(
                    visitOrder, quotes, driverState, start, totalDurationS
            );

            return new SimulationResult(
                    visitOrder,
                    totalDistanceM,
                    totalDurationS,
                    emptyRunDistanceM,
                    routeDeviationM,
                    scheduleViolations,
                    true,
                    null
            );
        } catch (Exception e) {
            log.error("Fast route simulation failed", e);
            return SimulationResult.failure("Route simulation error: " + e.getMessage());
        }
    }

    /**
     * 주어진 순서대로 경로를 시뮬레이션 (순서 최적화 없음).
     * 양방향 경로-적재 최적화에서 적재 효율에 따른 배송 순서 변경 시 사용.
     *
     * @param driverState 기사 상태 (현재 위치, 종료 위치 등)
     * @param orderedQuotes 배송 순서가 결정된 Quote 목록 (LIFO 기준)
     * @return 시뮬레이션 결과
     */
    public SimulationResult simulateWithFixedOrder(DriverState driverState, List<Quote> orderedQuotes) {
        try {
            if (orderedQuotes == null || orderedQuotes.isEmpty()) {
                return SimulationResult.failure("No quotes provided");
            }

            // 주어진 순서대로 픽업-배송 순서 생성 (LIFO: 1→2→3→3→2→1)
            List<CargoVisit> visitOrder = createFixedLIFOVisitOrder(orderedQuotes);
            if (visitOrder.isEmpty()) {
                return SimulationResult.failure("No visit order");
            }

            Place start = driverState.currentLocation();
            Place first = visitOrder.get(0).location();

            int emptyRunDistanceM = haversineDistanceM(start, first);
            int totalDistanceM = emptyRunDistanceM;

            Place prev = first;
            for (int i = 1; i < visitOrder.size(); i++) {
                Place next = visitOrder.get(i).location();
                totalDistanceM += haversineDistanceM(prev, next);
                prev = next;
            }

            // 시간대별 속도 모델 적용
            LocalDateTime departureTime = resolveScheduleValidationStartTime(driverState);
            int totalDurationS = calculateDurationWithTimeModel(totalDistanceM, departureTime);
            int routeDeviationM = 0;
            if (driverState.endLocation() != null) {
                routeDeviationM = calculateRouteDeviationHaversine(
                        start,
                        driverState.endLocation(),
                        visitOrder
                );
            }

            int scheduleViolations = checkScheduleViolations(
                    visitOrder, orderedQuotes, driverState, start, totalDurationS
            );

            return new SimulationResult(
                    visitOrder,
                    totalDistanceM,
                    totalDurationS,
                    emptyRunDistanceM,
                    routeDeviationM,
                    scheduleViolations,
                    true,
                    null
            );
        } catch (Exception e) {
            log.error("Fixed order route simulation failed", e);
            return SimulationResult.failure("Route simulation error: " + e.getMessage());
        }
    }

    /**
     * 주어진 Quote 순서를 LIFO 방문 순서로 변환.
     * 픽업: 1→2→3 순서, 배송: 3→2→1 순서 (마지막 픽업 화물 먼저 배송)
     */
    private List<CargoVisit> createFixedLIFOVisitOrder(List<Quote> orderedQuotes) {
        List<CargoVisit> visits = new ArrayList<>();
        int sequence = 1;

        // 픽업 순서: 주어진 순서대로
        for (Quote quote : orderedQuotes) {
            if (!quote.hasValidCoordinates()) {
                continue;
            }
            visits.add(new CargoVisit(
                    sequence++,
                    quote.quoteId(),
                    CargoVisit.VisitType.PICKUP,
                    quote.origin(),
                    quote.origin().address(),
                    null, null, null
            ));
        }

        // 배송 순서: 역순 (LIFO)
        for (int i = orderedQuotes.size() - 1; i >= 0; i--) {
            Quote quote = orderedQuotes.get(i);
            if (!quote.hasValidCoordinates()) {
                continue;
            }
            visits.add(new CargoVisit(
                    sequence++,
                    quote.quoteId(),
                    CargoVisit.VisitType.DELIVERY,
                    quote.destination(),
                    quote.destination().address(),
                    null, null, null
            ));
        }

        return visits;
    }

    private List<CargoVisit> optimizeVisitOrderWithHaversine(DriverState driverState, List<Quote> quotes) {
        if (quotes == null || quotes.isEmpty()) {
            return List.of();
        }

        Place start = driverState.currentLocation();
        Map<Long, Quote> quoteById = quotes.stream().collect(Collectors.toMap(Quote::quoteId, q -> q));

        List<CargoVisit> rawOrder = createRawVisitOrderWithNN(start, quotes);
        if (rawOrder.isEmpty()) {
            return rawOrder;
        }

        List<CargoVisit> twoOptOrder = twoOptImprove(rawOrder, start);
        int baseDistanceM = totalRouteDistanceHaversineM(start, twoOptOrder);

        List<CargoVisit> slackSwapOrder = trySlackSwap(twoOptOrder, start, DELIVERY_SLACK_SWAP_RATIO);
        List<CargoVisit> clusterFromTwoOpt = reorderByClusterWithinSlack(twoOptOrder, quoteById, start, baseDistanceM);
        List<CargoVisit> clusterFromSlack = reorderByClusterWithinSlack(slackSwapOrder, quoteById, start, baseDistanceM);

        List<List<CargoVisit>> candidates = List.of(twoOptOrder, slackSwapOrder, clusterFromTwoOpt, clusterFromSlack);
        VisitOrderEval best = null;

        for (List<CargoVisit> candidate : candidates) {
            VisitOrderEval eval = evaluateVisitOrder(candidate, driverState, quotes, start);
            if (eval == null) {
                continue;
            }
            if (best == null || eval.isBetterThan(best)) {
                best = eval;
            }
        }

        if (best == null) {
            return twoOptOrder;
        }

        List<CargoVisit> alnsImproved = alnsImprove(best.order(), start, quotes, quoteById, driverState);
        VisitOrderEval alnsEval = evaluateVisitOrder(alnsImproved, driverState, quotes, start);
        if (alnsEval != null && alnsEval.isBetterThan(best)) {
            best = alnsEval;
        }

        if (shouldRunMatheuristic(driverState, quotes)) {
            List<CargoVisit> exactOrder = optimizeByMatheuristicExact(driverState, quotes);
            VisitOrderEval exactEval = evaluateVisitOrder(exactOrder, driverState, quotes, start);
            if (exactEval != null && exactEval.isBetterThan(best)) {
                best = exactEval;
            }
        }

        return best.order();
    }

    private VisitOrderEval evaluateVisitOrder(
            List<CargoVisit> candidate,
            DriverState driverState,
            List<Quote> quotes,
            Place start
    ) {
        if (candidate == null || candidate.isEmpty()) {
            return null;
        }

        List<CargoVisit> normalized = reSequenceVisits(candidate);
        if (!isValidVisitOrder(normalized)) {
            return null;
        }

        int distanceM = totalRouteDistanceHaversineM(start, normalized);
        int routeDeviationM = driverState.endLocation() != null
                ? calculateRouteDeviationHaversine(start, driverState.endLocation(), normalized)
                : 0;
        int scheduleViolations = checkScheduleViolations(normalized, quotes, driverState, start, 0);
        return new VisitOrderEval(normalized, scheduleViolations, distanceM, routeDeviationM);
    }

    private boolean shouldRunMatheuristic(DriverState driverState, List<Quote> quotes) {
        if (quotes == null || quotes.isEmpty() || quotes.size() > MATHEURISTIC_MAX_QUOTES) {
            return false;
        }

        long scheduledCount = quotes.stream().filter(Quote::hasScheduledDate).count();
        boolean scheduleComplex = scheduledCount >= 2;
        boolean combineComplex = quotes.size() >= 4;
        boolean homeRouteComplex = driverState != null
                && driverState.combinePreference() == DriverState.CombinePreference.HOME_ROUTE
                && quotes.size() >= 3;
        return scheduleComplex || combineComplex || homeRouteComplex;
    }

    private List<CargoVisit> alnsImprove(
            List<CargoVisit> seed,
            Place start,
            List<Quote> quotes,
            Map<Long, Quote> quoteById,
            DriverState driverState
    ) {
        if (seed == null || seed.isEmpty() || quotes.size() < 3) {
            return seed;
        }

        Random random = new Random(seed.hashCode() * 31L + quotes.size());
        List<CargoVisit> current = reSequenceVisits(seed);
        VisitOrderEval currentEval = evaluateVisitOrder(current, driverState, quotes, start);
        if (currentEval == null) {
            return seed;
        }

        List<CargoVisit> bestOrder = currentEval.order();
        VisitOrderEval bestEval = currentEval;
        double temperature = Math.max(50.0, currentEval.distanceM() * 0.03);

        for (int iter = 0; iter < ALNS_MAX_ITERATIONS; iter++) {
            List<CargoVisit> repaired = destroyAndRepair(current, quoteById, start, quotes, driverState, random);
            if (repaired == null || repaired.isEmpty()) {
                continue;
            }

            List<CargoVisit> candidate = twoOptImprove(repaired, start);
            VisitOrderEval candidateEval = evaluateVisitOrder(candidate, driverState, quotes, start);
            if (candidateEval == null) {
                continue;
            }

            boolean accept = candidateEval.isBetterThan(currentEval)
                    || acceptByAnnealing(currentEval, candidateEval, temperature, random);
            if (accept) {
                current = candidateEval.order();
                currentEval = candidateEval;
            }
            if (candidateEval.isBetterThan(bestEval)) {
                bestOrder = candidateEval.order();
                bestEval = candidateEval;
            }

            temperature *= 0.96;
        }

        return bestOrder;
    }

    private List<CargoVisit> destroyAndRepair(
            List<CargoVisit> base,
            Map<Long, Quote> quoteById,
            Place start,
            List<Quote> quotes,
            DriverState driverState,
            Random random
    ) {
        List<Long> uniqueQuoteIds = base.stream()
                .map(CargoVisit::quoteId)
                .distinct()
                .toList();
        if (uniqueQuoteIds.size() < 2) {
            return base;
        }

        int maxRemove = Math.min(ALNS_REMOVE_MAX, uniqueQuoteIds.size() - 1);
        int removeCount = Math.min(maxRemove, ALNS_REMOVE_MIN + random.nextInt(maxRemove - ALNS_REMOVE_MIN + 1));
        Set<Long> toRemove = selectRemovalQuoteIds(base, uniqueQuoteIds, start, removeCount, random);
        if (toRemove.isEmpty()) {
            return base;
        }

        List<CargoVisit> partial = base.stream()
                .filter(v -> !toRemove.contains(v.quoteId()))
                .collect(Collectors.toCollection(ArrayList::new));
        if (partial.isEmpty()) {
            return base;
        }

        List<Long> removedQuoteIds = new ArrayList<>(toRemove);
        Collections.shuffle(removedQuoteIds, random);
        return repairByGreedyInsertion(partial, removedQuoteIds, quoteById, start, quotes, driverState);
    }

    private Set<Long> selectRemovalQuoteIds(
            List<CargoVisit> base,
            List<Long> uniqueQuoteIds,
            Place start,
            int removeCount,
            Random random
    ) {
        Set<Long> result = new HashSet<>();
        List<Long> ranked = new ArrayList<>(uniqueQuoteIds);
        ranked.sort(Comparator.comparingDouble((Long quoteId) -> quoteDisruptionCost(base, start, quoteId)).reversed());

        int guidedCount = Math.min(removeCount, Math.max(1, removeCount / 2 + 1));
        for (int i = 0; i < guidedCount && i < ranked.size(); i++) {
            result.add(ranked.get(i));
        }

        while (result.size() < removeCount) {
            result.add(uniqueQuoteIds.get(random.nextInt(uniqueQuoteIds.size())));
        }
        return result;
    }

    private double quoteDisruptionCost(List<CargoVisit> visits, Place start, Long quoteId) {
        int pickupIdx = -1;
        int deliveryIdx = -1;
        for (int i = 0; i < visits.size(); i++) {
            CargoVisit v = visits.get(i);
            if (!quoteId.equals(v.quoteId())) {
                continue;
            }
            if (v.type() == CargoVisit.VisitType.PICKUP) {
                pickupIdx = i;
            } else {
                deliveryIdx = i;
            }
        }
        return localNodeDisruption(visits, start, pickupIdx) + localNodeDisruption(visits, start, deliveryIdx);
    }

    private double localNodeDisruption(List<CargoVisit> visits, Place start, int idx) {
        if (idx < 0 || idx >= visits.size()) {
            return 0.0;
        }
        Place prev = idx == 0 ? start : visits.get(idx - 1).location();
        Place curr = visits.get(idx).location();
        Place next = idx == visits.size() - 1 ? null : visits.get(idx + 1).location();

        int withNode = haversineDistanceM(prev, curr) + (next != null ? haversineDistanceM(curr, next) : 0);
        int withoutNode = next != null ? haversineDistanceM(prev, next) : 0;
        return Math.max(0.0, withNode - withoutNode);
    }

    private List<CargoVisit> repairByGreedyInsertion(
            List<CargoVisit> partial,
            List<Long> removedQuoteIds,
            Map<Long, Quote> quoteById,
            Place start,
            List<Quote> quotes,
            DriverState driverState
    ) {
        List<CargoVisit> working = reSequenceVisits(partial);
        for (Long quoteId : removedQuoteIds) {
            Quote quote = quoteById.get(quoteId);
            if (quote == null || !quote.hasValidCoordinates()) {
                continue;
            }
            List<CargoVisit> inserted = insertQuoteAtBestPosition(working, quote, start, quotes, driverState);
            if (inserted != null && !inserted.isEmpty()) {
                working = inserted;
            }
        }
        return reSequenceVisits(working);
    }

    private List<CargoVisit> insertQuoteAtBestPosition(
            List<CargoVisit> working,
            Quote quote,
            Place start,
            List<Quote> quotes,
            DriverState driverState
    ) {
        VisitOrderEval bestEval = null;
        List<CargoVisit> bestOrder = null;

        for (int pickupPos = 0; pickupPos <= working.size(); pickupPos++) {
            for (int deliveryPos = pickupPos + 1; deliveryPos <= working.size() + 1; deliveryPos++) {
                List<CargoVisit> candidate = new ArrayList<>(working);
                CargoVisit pickup = new CargoVisit(
                        0, quote.quoteId(), CargoVisit.VisitType.PICKUP,
                        quote.origin(), quote.origin().address(), null, null, null
                );
                CargoVisit delivery = new CargoVisit(
                        0, quote.quoteId(), CargoVisit.VisitType.DELIVERY,
                        quote.destination(), quote.destination().address(), null, null, null
                );

                candidate.add(pickupPos, pickup);
                candidate.add(Math.min(deliveryPos, candidate.size()), delivery);

                VisitOrderEval eval = evaluateVisitOrder(candidate, driverState, quotes, start);
                if (eval == null) {
                    continue;
                }
                if (bestEval == null || eval.isBetterThan(bestEval)) {
                    bestEval = eval;
                    bestOrder = eval.order();
                }
            }
        }

        return bestOrder;
    }

    private boolean acceptByAnnealing(
            VisitOrderEval current,
            VisitOrderEval candidate,
            double temperature,
            Random random
    ) {
        if (candidate.scheduleViolations() > current.scheduleViolations()) {
            return false;
        }
        if (candidate.scheduleViolations() < current.scheduleViolations()) {
            return true;
        }

        double deltaDistance = candidate.distanceM() - current.distanceM();
        double deltaDeviation = candidate.routeDeviationM() - current.routeDeviationM();
        double delta = deltaDistance + (deltaDeviation * 0.2);
        if (delta <= 0) {
            return true;
        }

        double denominator = Math.max(1.0, temperature);
        double probability = Math.exp(-delta / denominator);
        return random.nextDouble() < probability;
    }

    private List<CargoVisit> optimizeByMatheuristicExact(DriverState driverState, List<Quote> quotes) {
        if (quotes == null || quotes.isEmpty() || quotes.size() > MATHEURISTIC_MAX_QUOTES) {
            return List.of();
        }

        Place start = driverState.currentLocation();
        LocalDateTime scheduleStart = resolveScheduleValidationStartTime(driverState);
        int n = quotes.size();
        int totalNodes = n * 2;
        int[] path = new int[totalNodes];
        MatheuristicState state = new MatheuristicState();

        searchExactOrder(
                start,
                scheduleStart,
                quotes,
                0,
                0,
                0,
                0,
                path,
                0,
                state
        );

        if (state.bestPath == null) {
            return List.of();
        }

        return buildVisitOrderFromNodePath(quotes, state.bestPath);
    }

    private void searchExactOrder(
            Place currentPlace,
            LocalDateTime scheduleStart,
            List<Quote> quotes,
            int pickedMask,
            int deliveredMask,
            int distanceM,
            int scheduleViolations,
            int[] path,
            int depth,
            MatheuristicState state
    ) {
        if (state.visitedStates++ > MATHEURISTIC_MAX_STATES) {
            return;
        }

        if (state.bestPath != null) {
            if (scheduleViolations > state.bestViolations) {
                return;
            }
            if (scheduleViolations == state.bestViolations && distanceM >= state.bestDistanceM) {
                return;
            }
        }

        int n = quotes.size();
        int totalNodes = n * 2;
        if (depth == totalNodes) {
            state.bestViolations = scheduleViolations;
            state.bestDistanceM = distanceM;
            state.bestPath = Arrays.copyOf(path, totalNodes);
            return;
        }

        List<Integer> nextNodes = new ArrayList<>();
        for (int node = 0; node < totalNodes; node++) {
            int quoteIdx = node % n;
            int bit = 1 << quoteIdx;
            if (node < n) {
                if ((pickedMask & bit) == 0) {
                    nextNodes.add(node);
                }
            } else {
                if ((pickedMask & bit) != 0 && (deliveredMask & bit) == 0) {
                    nextNodes.add(node);
                }
            }
        }

        nextNodes.sort(Comparator.comparingInt(node -> {
            Place nextPlace = resolveNodePlace(quotes, node);
            return haversineDistanceM(currentPlace, nextPlace);
        }));

        for (Integer node : nextNodes) {
            int quoteIdx = node % n;
            int bit = 1 << quoteIdx;
            boolean pickup = node < n;
            Quote quote = quotes.get(quoteIdx);
            Place nextPlace = resolveNodePlace(quotes, node);

            int segmentDistance = haversineDistanceM(currentPlace, nextPlace);
            int nextDistance = distanceM + segmentDistance;
            long segmentSeconds = (long) (segmentDistance / 1000.0 / 40.0 * 3600.0);
            LocalDateTime arrival = scheduleStart.plusSeconds(segmentSeconds);

            int nextViolations = scheduleViolations;
            LocalDateTime nextScheduleStart = arrival;
            if (pickup) {
                if (quote.hasScheduledDate() && arrival.isAfter(quote.scheduledDate())) {
                    nextViolations++;
                }
                nextScheduleStart = arrival.plusSeconds(PICKUP_HANDLING_SECONDS);
            }

            int nextPicked = pickedMask;
            int nextDelivered = deliveredMask;
            if (pickup) {
                nextPicked |= bit;
            } else {
                nextDelivered |= bit;
            }

            path[depth] = node;
            searchExactOrder(
                    nextPlace,
                    nextScheduleStart,
                    quotes,
                    nextPicked,
                    nextDelivered,
                    nextDistance,
                    nextViolations,
                    path,
                    depth + 1,
                    state
            );
        }
    }

    private Place resolveNodePlace(List<Quote> quotes, int node) {
        int n = quotes.size();
        if (node < n) {
            return quotes.get(node).origin();
        }
        return quotes.get(node - n).destination();
    }

    private List<CargoVisit> buildVisitOrderFromNodePath(List<Quote> quotes, int[] nodePath) {
        if (nodePath == null || nodePath.length == 0) {
            return List.of();
        }

        int n = quotes.size();
        List<CargoVisit> order = new ArrayList<>();
        int sequence = 1;
        for (int node : nodePath) {
            boolean pickup = node < n;
            Quote quote = pickup ? quotes.get(node) : quotes.get(node - n);
            Place place = pickup ? quote.origin() : quote.destination();
            CargoVisit visit = new CargoVisit(
                    sequence++,
                    quote.quoteId(),
                    pickup ? CargoVisit.VisitType.PICKUP : CargoVisit.VisitType.DELIVERY,
                    place,
                    place != null ? place.address() : null,
                    null,
                    null,
                    null
            );
            order.add(visit);
        }
        return order;
    }

    private static final class MatheuristicState {
        private int[] bestPath;
        private int bestViolations = Integer.MAX_VALUE;
        private int bestDistanceM = Integer.MAX_VALUE;
        private int visitedStates = 0;

        private MatheuristicState() {
        }
    }

    private List<CargoVisit> reorderByClusterWithinSlack(
            List<CargoVisit> source,
            Map<Long, Quote> quoteById,
            Place start,
            int baselineDistanceM
    ) {
        List<List<CargoVisit>> clusters = groupNearbyVisitsHaversine(source, CLUSTER_RADIUS_M);
        List<CargoVisit> reordered = new ArrayList<>();
        for (List<CargoVisit> cluster : clusters) {
            reordered.addAll(reorderClusterForLoading(cluster, quoteById));
        }

        List<CargoVisit> normalized = reSequenceVisits(reordered);
        int newDistanceM = totalRouteDistanceHaversineM(start, normalized);
        boolean withinSlack = (newDistanceM <= baselineDistanceM + MAX_ADDED_DISTANCE_M)
                && (newDistanceM <= baselineDistanceM * (1 + MAX_ADDED_RATIO));
        return withinSlack ? normalized : source;
    }

    public List<CargoVisit> twoOptImprove(List<CargoVisit> visits, Place start) {
        if (visits.size() <= 3) return visits;

        List<CargoVisit> best = new ArrayList<>(visits);
        int bestDistM = totalRouteDistanceHaversineM(start, best);

        Map<Long, Integer> pickupIdx = new HashMap<>();
        Map<Long, Integer> deliveryIdx = new HashMap<>();
        rebuildIndices(best, pickupIdx, deliveryIdx);

        for (int iter = 0; iter < TWO_OPT_MAX_ITERATIONS; iter++) {
            boolean improved = false;

            for (int i = 0; i < best.size() - 1; i++) {
                for (int j = i + 2; j < best.size(); j++) {
                    if (!canReverseSegment(best, i + 1, j, pickupIdx, deliveryIdx)) continue;

                    List<CargoVisit> candidate = twoOptSwap(best, i, j);
                    int candidateDistM = totalRouteDistanceHaversineM(start, candidate);
                    if (candidateDistM < bestDistM) {
                        best = candidate;
                        bestDistM = candidateDistM;
                        improved = true;
                        rebuildIndices(best, pickupIdx, deliveryIdx);
                    }
                }
            }

            if (!improved) {
                break;
            }
        }

        return reSequenceVisits(best);
    }

    private void rebuildIndices(List<CargoVisit> visits, Map<Long, Integer> pickupIdx, Map<Long, Integer> deliveryIdx) {
        pickupIdx.clear();
        deliveryIdx.clear();
        for (int i = 0; i < visits.size(); i++) {
            CargoVisit v = visits.get(i);
            if (v.type() == CargoVisit.VisitType.PICKUP) pickupIdx.put(v.quoteId(), i);
            else deliveryIdx.put(v.quoteId(), i);
        }
    }

    private boolean canReverseSegment(
            List<CargoVisit> visits,
            int from,
            int to,
            Map<Long, Integer> pickupIdx,
            Map<Long, Integer> deliveryIdx
    ) {
        for (int k = from; k <= to; k++) {
            CargoVisit v = visits.get(k);
            if (v.type() == CargoVisit.VisitType.PICKUP) {
                Integer d = deliveryIdx.get(v.quoteId());
                if (d != null && d < from) return false;
            } else {
                Integer p = pickupIdx.get(v.quoteId());
                if (p != null && p > to) return false;
            }
        }
        return true;
    }

    private List<CargoVisit> twoOptSwap(List<CargoVisit> visits, int i, int j) {
        List<CargoVisit> result = new ArrayList<>();
        for (int k = 0; k <= i; k++) {
            result.add(visits.get(k));
        }
        for (int k = j; k > i; k--) {
            result.add(visits.get(k));
        }
        for (int k = j + 1; k < visits.size(); k++) {
            result.add(visits.get(k));
        }
        return result;
    }

    private boolean isValidVisitOrder(List<CargoVisit> visits) {
        Set<Long> pickedUp = new HashSet<>();
        for (CargoVisit v : visits) {
            if (v.type() == CargoVisit.VisitType.PICKUP) {
                pickedUp.add(v.quoteId());
            } else if (!pickedUp.contains(v.quoteId())) {
                return false;
            }
        }
        return true;
    }

    private List<CargoVisit> createRawVisitOrderWithNN(Place currentPos, List<Quote> quotes) {
        List<Quote> byTotalDistance = new ArrayList<>(quotes);
        byTotalDistance.sort(Comparator.comparingDouble(q -> {
            double toPickup = candidateFilterService.haversineDistance(
                    currentPos.latitude(), currentPos.longitude(),
                    q.origin().latitude(), q.origin().longitude()
            );
            double pickupToDelivery = candidateFilterService.haversineDistance(
                    q.origin().latitude(), q.origin().longitude(),
                    q.destination().latitude(), q.destination().longitude()
            );
            return toPickup + pickupToDelivery;
        }));

        List<CargoVisit> visits = new ArrayList<>();
        int seq = 1;

        for (Quote q : byTotalDistance) {
            visits.add(new CargoVisit(
                    seq++, q.quoteId(), CargoVisit.VisitType.PICKUP,
                    q.origin(), q.origin().address(), null, null, null
            ));
        }
        for (int i = byTotalDistance.size() - 1; i >= 0; i--) {
            Quote q = byTotalDistance.get(i);
            visits.add(new CargoVisit(
                    seq++, q.quoteId(), CargoVisit.VisitType.DELIVERY,
                    q.destination(), q.destination().address(), null, null, null
            ));
        }
        return visits;
    }

    private List<List<CargoVisit>> groupNearbyVisitsHaversine(List<CargoVisit> visits, double radiusM) {
        if (visits.isEmpty()) return List.of();

        List<List<CargoVisit>> clusters = new ArrayList<>();
        List<CargoVisit> current = new ArrayList<>();
        current.add(visits.get(0));
        Place prev = visits.get(0).location();

        for (int i = 1; i < visits.size(); i++) {
            CargoVisit v = visits.get(i);
            double distM = candidateFilterService.haversineDistance(
                    prev.latitude(), prev.longitude(),
                    v.location().latitude(), v.location().longitude()
            ) * 1000.0;

            if (distM <= radiusM) {
                current.add(v);
            } else {
                clusters.add(new ArrayList<>(current));
                current.clear();
                current.add(v);
            }
            prev = v.location();
        }

        if (!current.isEmpty()) {
            clusters.add(current);
        }
        return clusters;
    }

    private List<CargoVisit> reorderClusterForLoading(List<CargoVisit> cluster, Map<Long, Quote> quoteById) {
        List<CargoVisit> pickups = new ArrayList<>();
        List<CargoVisit> deliveries = new ArrayList<>();
        for (CargoVisit v : cluster) {
            if (v.type() == CargoVisit.VisitType.PICKUP) pickups.add(v);
            else deliveries.add(v);
        }
        if (deliveries.size() <= 1) {
            return new ArrayList<>(cluster);
        }
        deliveries.sort(Comparator.comparingDouble(v -> {
            Quote q = quoteById.get(v.quoteId());
            return q != null && q.volumeCbm() != null ? q.volumeCbm() : 0.0;
        }));
        List<CargoVisit> result = new ArrayList<>(pickups);
        result.addAll(deliveries);
        return result;
    }

    private List<CargoVisit> reSequenceVisits(List<CargoVisit> visits) {
        List<CargoVisit> out = new ArrayList<>();
        int seq = 1;
        for (CargoVisit v : visits) {
            out.add(new CargoVisit(
                    seq++, v.quoteId(), v.type(), v.location(), v.address(),
                    v.estimatedArrivalTime(), v.distanceFromPrev(), v.durationFromPrev()
            ));
        }
        return out;
    }

    private int totalRouteDistanceHaversineM(Place start, List<CargoVisit> visits) {
        if (visits.isEmpty()) return 0;
        int totalM = 0;
        Place prev = start;
        for (CargoVisit v : visits) {
            totalM += haversineDistanceM(prev, v.location());
            prev = v.location();
        }
        return totalM;
    }

    private int haversineDistanceM(Place from, Place to) {
        double distKm = candidateFilterService.haversineDistance(
                from.latitude(), from.longitude(),
                to.latitude(), to.longitude()
        );
        return (int) (distKm * ROAD_COEFFICIENT * 1000.0);
    }

    private int calculateRouteDeviationHaversine(Place start, Place end, List<CargoVisit> visits) {
        int directDistM = haversineDistanceM(start, end);
        int routeDistM = 0;
        Place prev = start;
        for (CargoVisit visit : visits) {
            routeDistM += haversineDistanceM(prev, visit.location());
            prev = visit.location();
        }
        routeDistM += haversineDistanceM(prev, end);
        return Math.max(0, routeDistM - directDistM);
    }

    private int calculateRouteDeviationReal(Place start, Place end, List<CargoVisit> visits) {
        RouteDistance directRoute = cachedRouteService.getDistance(start, end);
        int directDistM = directRoute.distanceM();

        int routeDistM = 0;
        Place prev = start;
        for (CargoVisit visit : visits) {
            RouteDistance segment = cachedRouteService.getDistance(prev, visit.location());
            routeDistM += segment.distanceM();
            prev = visit.location();
        }
        RouteDistance last = cachedRouteService.getDistance(prev, end);
        routeDistM += last.distanceM();

        return Math.max(0, routeDistM - directDistM);
    }

    private List<CargoVisit> enrichVisitOrderReal(List<CargoVisit> visits, Place startLocation) {
        List<CargoVisit> enriched = new ArrayList<>();
        Place prev = startLocation;
        long accumulatedTimeMs = 0L;

        for (CargoVisit visit : visits) {
            RouteDistance seg = cachedRouteService.getDistance(prev, visit.location());
            int distM = seg.distanceM();
            int durationS = seg.durationS();
            accumulatedTimeMs += durationS * 1000L;

            enriched.add(new CargoVisit(
                    visit.sequence(),
                    visit.quoteId(),
                    visit.type(),
                    visit.location(),
                    visit.address(),
                    accumulatedTimeMs,
                    distM,
                    durationS
            ));
            prev = visit.location();
        }
        return enriched;
    }

    public List<DestinationCluster> clusterByDestination(List<Quote> quotes, double radiusKm) {
        if (quotes == null || quotes.isEmpty()) return List.of();

        List<DestinationCluster> clusters = new ArrayList<>();
        boolean[] assigned = new boolean[quotes.size()];

        for (int i = 0; i < quotes.size(); i++) {
            if (assigned[i]) continue;

            Quote seed = quotes.get(i);
            List<Quote> members = new ArrayList<>();
            members.add(seed);
            assigned[i] = true;

            for (int j = i + 1; j < quotes.size(); j++) {
                if (assigned[j]) continue;
                Quote other = quotes.get(j);
                double dist = candidateFilterService.haversineDistance(
                        seed.destination().latitude(), seed.destination().longitude(),
                        other.destination().latitude(), other.destination().longitude()
                );
                if (dist <= radiusKm) {
                    members.add(other);
                    assigned[j] = true;
                }
            }

            double avgLat = members.stream().mapToDouble(q -> q.destination().latitude()).average().orElse(0.0);
            double avgLng = members.stream().mapToDouble(q -> q.destination().longitude()).average().orElse(0.0);
            clusters.add(new DestinationCluster(new Place(null, null, avgLat, avgLng), members));
        }

        return clusters;
    }

    public List<DestinationCluster> orderClustersByTSP(List<DestinationCluster> clusters, Place start) {
        if (clusters.size() <= 1) return clusters;

        List<DestinationCluster> remaining = new ArrayList<>(clusters);
        List<DestinationCluster> ordered = new ArrayList<>();
        Place current = start;

        while (!remaining.isEmpty()) {
            int nearest = 0;
            double nearestDist = Double.MAX_VALUE;
            for (int i = 0; i < remaining.size(); i++) {
                Place center = remaining.get(i).center();
                double dist = candidateFilterService.haversineDistance(
                        current.latitude(), current.longitude(),
                        center.latitude(), center.longitude()
                );
                if (dist < nearestDist) {
                    nearestDist = dist;
                    nearest = i;
                }
            }
            DestinationCluster picked = remaining.remove(nearest);
            ordered.add(picked);
            current = picked.center();
        }

        return ordered;
    }

    public List<CargoVisit> optimizeWithClusterTSP(
            DriverState driverState,
            List<Quote> quotes,
            double clusterRadiusKm
    ) {
        List<DestinationCluster> clusters = clusterByDestination(quotes, clusterRadiusKm);
        List<DestinationCluster> orderedClusters = orderClustersByTSP(clusters, driverState.currentLocation());

        List<CargoVisit> visits = new ArrayList<>();
        int seq = 1;

        List<Quote> pickupOrdered = new ArrayList<>();
        for (DestinationCluster cluster : orderedClusters) {
            pickupOrdered.addAll(cluster.members());
        }
        pickupOrdered.sort(Comparator.comparingDouble(q ->
                candidateFilterService.haversineDistance(
                        driverState.currentLocation().latitude(), driverState.currentLocation().longitude(),
                        q.origin().latitude(), q.origin().longitude()
                )));

        for (Quote q : pickupOrdered) {
            visits.add(new CargoVisit(
                    seq++, q.quoteId(), CargoVisit.VisitType.PICKUP,
                    q.origin(), q.origin().address(), null, null, null
            ));
        }

        List<Quote> deliveryOrder = new ArrayList<>(pickupOrdered);
        Collections.reverse(deliveryOrder);
        for (Quote q : deliveryOrder) {
            visits.add(new CargoVisit(
                    seq++, q.quoteId(), CargoVisit.VisitType.DELIVERY,
                    q.destination(), q.destination().address(), null, null, null
            ));
        }

        return visits;
    }

    public record DestinationCluster(Place center, List<Quote> members) {}

    public List<CargoVisit> trySlackSwap(List<CargoVisit> visits, Place start, double slackRatio) {
        if (visits.size() <= 3) return visits;

        List<CargoVisit> best = new ArrayList<>(visits);
        int bestDistM = totalRouteDistanceHaversineM(start, best);
        int maxAllowedDistM = (int) (bestDistM * (1 + slackRatio));

        List<Integer> deliveryIndices = new ArrayList<>();
        for (int i = 0; i < best.size(); i++) {
            if (best.get(i).type() == CargoVisit.VisitType.DELIVERY) {
                deliveryIndices.add(i);
            }
        }

        boolean improved = true;
        int maxIter = 30;
        while (improved && maxIter-- > 0) {
            improved = false;
            for (int di = 0; di < deliveryIndices.size() - 1; di++) {
                int idx1 = deliveryIndices.get(di);
                int idx2 = deliveryIndices.get(di + 1);

                List<CargoVisit> candidate = new ArrayList<>(best);
                CargoVisit tmp = candidate.get(idx1);
                candidate.set(idx1, candidate.get(idx2));
                candidate.set(idx2, tmp);

                if (!isValidVisitOrder(candidate)) continue;

                int candidateDistM = totalRouteDistanceHaversineM(start, candidate);
                if (candidateDistM <= maxAllowedDistM && candidateDistM < bestDistM) {
                    best = candidate;
                    bestDistM = candidateDistM;
                    improved = true;

                    deliveryIndices.clear();
                    for (int i = 0; i < best.size(); i++) {
                        if (best.get(i).type() == CargoVisit.VisitType.DELIVERY) {
                            deliveryIndices.add(i);
                        }
                    }
                    break;
                }
            }
        }

        return reSequenceVisits(best);
    }

    public List<CargoVisit> createSimpleVisitOrder(List<Quote> quotes) {
        List<CargoVisit> visits = new ArrayList<>();
        int sequence = 1;

        List<Quote> sortedQuotes = new ArrayList<>(quotes);
        for (Quote quote : sortedQuotes) {
            visits.add(new CargoVisit(
                    sequence++,
                    quote.quoteId(),
                    CargoVisit.VisitType.PICKUP,
                    quote.origin(),
                    quote.origin().address(),
                    null, null, null
            ));
        }

        for (int i = sortedQuotes.size() - 1; i >= 0; i--) {
            Quote quote = sortedQuotes.get(i);
            visits.add(new CargoVisit(
                    sequence++,
                    quote.quoteId(),
                    CargoVisit.VisitType.DELIVERY,
                    quote.destination(),
                    quote.destination().address(),
                    null, null, null
            ));
        }
        return visits;
    }

    public RouteResponse calculateRealRoute(Place origin, Place destination, List<Place> waypoints) {
        try {
            return kakaoRouteService.findRoute(new RouteRequest(origin, destination, waypoints));
        } catch (Exception e) {
            log.warn("Route API call failed, fallback to estimate: {}", e.getMessage());
            return null;
        }
    }

    private int checkScheduleViolations(
            List<CargoVisit> visitOrder,
            List<Quote> quotes,
            DriverState driverState,
            Place startPlace,
            int totalDurationS
    ) {
        Map<Long, LocalDateTime> scheduleMap = new HashMap<>();
        for (Quote q : quotes) {
            if (q.hasScheduledDate()) {
                scheduleMap.put(q.quoteId(), q.scheduledDate());
            }
        }
        if (scheduleMap.isEmpty()) return 0;

        LocalDateTime cursor = resolveScheduleValidationStartTime(driverState);
        Place prevPlace = startPlace;
        int violations = 0;

        for (CargoVisit visit : visitOrder) {
            long segmentSeconds;
            if (visit.durationFromPrev() != null && visit.durationFromPrev() > 0) {
                segmentSeconds = visit.durationFromPrev();
            } else {
                int distM = haversineDistanceM(prevPlace, visit.location());
                segmentSeconds = (long) (distM / 1000.0 / 40.0 * 3600.0);
            }

            cursor = cursor.plusSeconds(segmentSeconds);

            if (visit.type() == CargoVisit.VisitType.PICKUP) {
                LocalDateTime scheduled = scheduleMap.get(visit.quoteId());
                if (scheduled != null && cursor.isAfter(scheduled)) {
                    violations++;
                }
                cursor = cursor.plusSeconds(PICKUP_HANDLING_SECONDS);
            }

            prevPlace = visit.location();
        }

        return violations;
    }

    private LocalDateTime resolveScheduleValidationStartTime(DriverState driverState) {
        LocalDateTime now = LocalDateTime.now();
        if (driverState == null || driverState.availableAt() == null) {
            return now;
        }
        return driverState.availableAt().isAfter(now) ? driverState.availableAt() : now;
    }

    /**
     * 시간대별 예상 속도 계산 (km/h)
     * - 출퇴근 시간 (7-9시, 17-20시): 20 km/h
     * - 야간 (23시-5시): 50 km/h
     * - 주말: +5 km/h 보너스
     * - 기타: 40 km/h
     */
    private double getExpectedSpeedKmh(LocalDateTime departureTime) {
        if (departureTime == null) {
            departureTime = LocalDateTime.now();
        }

        int hour = departureTime.getHour();
        java.time.DayOfWeek dayOfWeek = departureTime.getDayOfWeek();
        boolean isWeekend = (dayOfWeek == java.time.DayOfWeek.SATURDAY || dayOfWeek == java.time.DayOfWeek.SUNDAY);

        double speed;

        // 야간 (23시-5시)
        if (hour >= 23 || hour < 5) {
            speed = SPEED_NIGHT_KMH;
        }
        // 출근 시간 (7-9시)
        else if (hour >= 7 && hour < 9) {
            speed = isWeekend ? SPEED_BASE_KMH : SPEED_RUSH_HOUR_KMH;
        }
        // 퇴근 시간 (17-20시)
        else if (hour >= 17 && hour < 20) {
            speed = isWeekend ? SPEED_BASE_KMH : SPEED_RUSH_HOUR_KMH;
        }
        // 점심 시간 (12-13시) - 약간 혼잡
        else if (hour >= 12 && hour < 13) {
            speed = SPEED_BASE_KMH - 5.0;
        }
        // 일반 시간
        else {
            speed = SPEED_BASE_KMH;
        }

        // 주말 보너스 (러시아워 제외)
        if (isWeekend && speed == SPEED_BASE_KMH) {
            speed += SPEED_WEEKEND_BONUS_KMH;
        }

        return Math.max(15.0, speed); // 최소 15 km/h 보장
    }

    /**
     * 거리와 출발 시간을 기반으로 예상 소요 시간 계산 (초)
     */
    private int calculateDurationWithTimeModel(int distanceM, LocalDateTime departureTime) {
        double speedKmh = getExpectedSpeedKmh(departureTime);
        double distanceKm = distanceM / 1000.0;
        return (int) (distanceKm / speedKmh * 3600.0);
    }

    private record VisitOrderEval(
            List<CargoVisit> order,
            int scheduleViolations,
            int distanceM,
            int routeDeviationM
    ) {
        private boolean isBetterThan(VisitOrderEval other) {
            if (scheduleViolations != other.scheduleViolations) {
                return scheduleViolations < other.scheduleViolations;
            }
            if (distanceM != other.distanceM) {
                return distanceM < other.distanceM;
            }
            return routeDeviationM < other.routeDeviationM;
        }
    }
}
