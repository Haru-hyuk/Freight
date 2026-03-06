package com.freight.backend.gpsload.routeassembly.service;

import com.freight.backend.gpsload.route.model.Place;
import com.freight.backend.gpsload.routeassembly.model.AssemblyParameters;
import com.freight.backend.gpsload.routeassembly.model.DriverState;
import com.freight.backend.gpsload.routeassembly.model.Quote;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * 후보 견적에서 단건/합짐 조합을 생성한다.
 *
 * 기본 전략:
 * 1) 단건은 항상 유지
 * 2) 다건은 Beam Search 우선
 * 3) 후보가 적으면 완전탐색(2건/3건), 빔 결과가 부족하면 Greedy fallback
 */
@Service
public class CombinationGeneratorService {

    private static final Logger log = LoggerFactory.getLogger(CombinationGeneratorService.class);

    // 후보 수가 이 값 이상이면 Beam Search를 사용한다.
    private static final int BEAM_THRESHOLD = 15;
    // Beam Search 탐색 폭 기본 설정 (동적 조정됨)
    private static final int BEAM_WIDTH_BASE = 28;
    private static final int BEAM_WIDTH_MIN = 20;
    private static final int BEAM_WIDTH_MAX = 50;
    private static final int BEAM_POOL_LIMIT_BASE = 70;
    private static final int BEAM_POOL_LIMIT_MAX = 100;
    private static final int BEAM_BRANCH_FACTOR_BASE = 14;
    private static final int BEAM_BRANCH_FACTOR_MIN = 10;
    private static final int BEAM_BRANCH_FACTOR_MAX = 20;

    // Beam 결과가 너무 적을 때 보완용 Greedy seed 탐색
    private static final int GREEDY_SEED_LIMIT = 10;
    private static final int GREEDY_POOL_LIMIT = 40;

    private final CandidateFilterService candidateFilterService;

    public CombinationGeneratorService(CandidateFilterService candidateFilterService) {
        this.candidateFilterService = candidateFilterService;
    }

    public List<List<Quote>> generateCombinations(
            DriverState driverState,
            List<Quote> candidates,
            AssemblyParameters params
    ) {
        List<List<Quote>> combinations = new ArrayList<>();

        // 1) 단건은 항상 후보로 유지
        for (Quote quote : candidates) {
            if (canLoad(driverState, List.of(quote))) {
                combinations.add(List.of(quote));
            }
        }

        // 2) 다건 허용 여부 확인
        if (driverState.combinePreference() != DriverState.CombinePreference.ALLOW
                && driverState.combinePreference() != DriverState.CombinePreference.HOME_ROUTE) {
            return combinations;
        }

        List<Quote> combineAllowed = candidates.stream()
                .filter(Quote::isCombineAllowed)
                .toList();
        if (combineAllowed.size() < 2) {
            return combinations;
        }

        List<List<Quote>> multiCombos;
        if (combineAllowed.size() >= BEAM_THRESHOLD) {
            multiCombos = generateBeamCombinations(driverState, combineAllowed, params);

            // 빔 탐색 결과가 너무 적으면 Greedy로 보완
            if (multiCombos.size() < 3) {
                log.info("Beam result is sparse ({}), running greedy fallback", multiCombos.size());
                multiCombos = mergeWithoutDuplicate(
                        multiCombos,
                        generateGreedyCombinations(driverState, combineAllowed, params)
                );
            }
        } else {
            multiCombos = new ArrayList<>();
            if (params.maxCombineCount() >= 2) {
                multiCombos.addAll(generatePairs(driverState, combineAllowed));
            }
            if (params.maxCombineCount() >= 3) {
                multiCombos.addAll(generateTriples(driverState, combineAllowed));
            }
        }

        combinations = mergeWithoutDuplicate(combinations, multiCombos);
        return combinations;
    }

    private List<List<Quote>> generatePairs(DriverState driverState, List<Quote> quotes) {
        List<List<Quote>> pairs = new ArrayList<>();
        Place current = driverState.currentLocation();

        for (int i = 0; i < quotes.size(); i++) {
            for (int j = i + 1; j < quotes.size(); j++) {
                List<Quote> pair = List.of(quotes.get(i), quotes.get(j));
                if (canLoad(driverState, pair) && canMeetSchedulesInAnyOrder(current, pair)) {
                    pairs.add(pair);
                }
            }
        }
        return pairs;
    }

    private List<List<Quote>> generateTriples(DriverState driverState, List<Quote> quotes) {
        List<List<Quote>> triples = new ArrayList<>();
        Place current = driverState.currentLocation();

        for (int i = 0; i < quotes.size(); i++) {
            for (int j = i + 1; j < quotes.size(); j++) {
                for (int k = j + 1; k < quotes.size(); k++) {
                    List<Quote> triple = List.of(quotes.get(i), quotes.get(j), quotes.get(k));
                    if (canLoad(driverState, triple) && canMeetSchedulesInAnyOrder(current, triple)) {
                        triples.add(triple);
                    }
                }
            }
        }
        return triples;
    }

    /**
     * Beam Search로 조합 생성.
     * - 상태: 선택된 quote 목록, 다음 시작 인덱스, 사용 용량/중량, 상태 점수
     * - 각 깊이에서 상위 beamWidth개 상태만 유지
     * - 후보 수에 따라 파라미터 동적 조정
     */
    private List<List<Quote>> generateBeamCombinations(
            DriverState driverState,
            List<Quote> candidates,
            AssemblyParameters params
    ) {
        int maxCombine = Math.max(2, params.maxCombineCount());
        Place current = driverState.currentLocation();

        // 후보 수에 따른 동적 파라미터 계산
        int candidateCount = candidates.size();
        int beamWidth = calculateDynamicBeamWidth(candidateCount);
        int poolLimit = calculateDynamicPoolLimit(candidateCount);
        int branchFactor = calculateDynamicBranchFactor(candidateCount);

        List<Quote> pool = rankCandidatesForBeam(driverState, candidates);
        if (pool.size() > poolLimit) {
            pool = new ArrayList<>(pool.subList(0, poolLimit));
        }

        Set<String> seen = new HashSet<>();
        List<List<Quote>> result = new ArrayList<>();
        List<BeamState> beam = new ArrayList<>();
        beam.add(new BeamState(List.of(), 0, 0.0, 0.0, 0.0));

        for (int depth = 1; depth <= maxCombine; depth++) {
            List<BeamState> nextBeam = new ArrayList<>();

            for (BeamState state : beam) {
                int expanded = 0;
                for (int i = state.nextStartIndex(); i < pool.size(); i++) {
                    if (expanded >= branchFactor) {
                        break;
                    }

                    Quote q = pool.get(i);
                    double nextCbm = state.usedCbm() + safeCbm(q);
                    double nextWeight = state.usedWeight() + safeWeight(q);
                    if (!driverState.canLoad(nextCbm, nextWeight)) {
                        continue;
                    }

                    List<Quote> nextSelected = new ArrayList<>(state.selected());
                    nextSelected.add(q);

                    if (!canMeetSchedulesInAnyOrder(current, nextSelected)) {
                        continue;
                    }

                    double score = estimateBeamScore(driverState, current, nextSelected);
                    BeamState nextState = new BeamState(nextSelected, i + 1, nextCbm, nextWeight, score);
                    nextBeam.add(nextState);
                    expanded++;

                    if (nextSelected.size() >= 2) {
                        addIfNew(result, seen, nextSelected);
                    }
                }
            }

            if (nextBeam.isEmpty()) {
                break;
            }

            nextBeam.sort(Comparator.comparingDouble(BeamState::score).reversed());
            beam = new ArrayList<>(nextBeam.subList(0, Math.min(beamWidth, nextBeam.size())));
        }

        log.info("Beam combinations generated: pool={}, result={}, beamWidth={}, branchFactor={}",
                pool.size(), result.size(), beamWidth, branchFactor);
        return result;
    }

    /**
     * 후보 수에 따른 동적 Beam Width 계산
     * 후보가 많을수록 더 넓은 탐색 필요
     */
    private int calculateDynamicBeamWidth(int candidateCount) {
        if (candidateCount <= 20) {
            return BEAM_WIDTH_MIN;
        } else if (candidateCount <= 40) {
            return BEAM_WIDTH_BASE;
        } else if (candidateCount <= 60) {
            return BEAM_WIDTH_BASE + 10;
        } else {
            return BEAM_WIDTH_MAX;
        }
    }

    /**
     * 후보 수에 따른 동적 Pool Limit 계산
     */
    private int calculateDynamicPoolLimit(int candidateCount) {
        if (candidateCount <= 30) {
            return candidateCount; // 전체 후보 사용
        } else if (candidateCount <= 50) {
            return BEAM_POOL_LIMIT_BASE;
        } else {
            return Math.min(BEAM_POOL_LIMIT_MAX, candidateCount * 3 / 4);
        }
    }

    /**
     * 후보 수에 따른 동적 Branch Factor 계산
     * 후보가 많을수록 각 상태에서 더 많은 분기 탐색
     */
    private int calculateDynamicBranchFactor(int candidateCount) {
        if (candidateCount <= 20) {
            return BEAM_BRANCH_FACTOR_MIN;
        } else if (candidateCount <= 40) {
            return BEAM_BRANCH_FACTOR_BASE;
        } else {
            return Math.min(BEAM_BRANCH_FACTOR_MAX, BEAM_BRANCH_FACTOR_BASE + (candidateCount - 40) / 10);
        }
    }

    /**
     * Beam 탐색용 상태 점수.
     * - 수익/밀도/적재율 보상
     * - 우회율/퍼짐도 패널티
     */
    private double estimateBeamScore(DriverState driverState, Place current, List<Quote> selected) {
        double revenue = totalRevenue(selected);
        double totalCbm = totalCbm(selected);
        double totalWeight = totalWeight(selected);

        double cbmUtil = driverState.remainingCbm() != null && driverState.remainingCbm() > 0
                ? Math.min(100.0, totalCbm / driverState.remainingCbm() * 100.0)
                : 0.0;
        double weightUtil = driverState.remainingWeight() != null && driverState.remainingWeight() > 0
                ? Math.min(100.0, totalWeight / driverState.remainingWeight() * 100.0)
                : 0.0;

        double avgDetour = selected.stream()
                .mapToDouble(q -> candidateFilterService.calculateDetourFactor(current, q, driverState.endLocation()))
                .average()
                .orElse(1.0);

        double spreadPenalty = averagePairwisePickupDistance(current, selected) * 4.0;
        // 다건 조합 보너스: 선형 증가 (ScoringService와 동일 로직)
        int size = selected.size();
        double sizeBonus = size == 2 ? 10.0 : (size >= 3 ? Math.min(40.0, 10.0 + (size - 2) * 8.0) : 0.0);

        return revenue * 0.005
                + (cbmUtil + weightUtil) * 0.35
                + sizeBonus
                - avgDetour * 60.0
                - spreadPenalty;
    }

    private List<Quote> rankCandidatesForBeam(DriverState driverState, List<Quote> candidates) {
        Place current = driverState.currentLocation();
        Place end = driverState.endLocation();
        LocalDateTime now = LocalDateTime.now();

        List<Quote> ranked = new ArrayList<>(candidates);
        ranked.sort(Comparator.comparingDouble((Quote q) -> {
            double price = q.finalPrice() != null ? q.finalPrice() : 0.0;
            double cbm = Math.max(0.1, safeCbm(q));
            double detour = candidateFilterService.calculateDetourFactor(current, q, end);
            double pickupDist = candidateFilterService.haversineDistance(
                    current.latitude(), current.longitude(),
                    q.origin().latitude(), q.origin().longitude()
            );
            double density = price / cbm;
            double urgencyBoost = q.hasDeliverySchedule()
                    ? Math.max(0.0, 18.0 - Math.max(0.0, q.minutesUntilDeliverySchedule(now)) / 45.0)
                    : 0.0;

            return density * 0.7
                    + price * 0.01
                    + urgencyBoost
                    - detour * 55.0
                    - pickupDist * 2.0;
        }).reversed());

        return ranked;
    }

    /**
     * Beam fallback용 Greedy 다중 seed 조합 생성.
     */
    private List<List<Quote>> generateGreedyCombinations(
            DriverState driverState,
            List<Quote> candidates,
            AssemblyParameters params
    ) {
        Set<String> seen = new HashSet<>();
        List<List<Quote>> result = new ArrayList<>();
        int maxCombine = Math.max(2, params.maxCombineCount());
        Place current = driverState.currentLocation();

        List<Quote> byScore = rankCandidatesForBeam(driverState, candidates);
        if (byScore.size() > GREEDY_POOL_LIMIT) {
            byScore = new ArrayList<>(byScore.subList(0, GREEDY_POOL_LIMIT));
        }

        int seedCount = Math.min(GREEDY_SEED_LIMIT, byScore.size());
        for (int seedIdx = 0; seedIdx < seedCount; seedIdx++) {
            List<Quote> selected = new ArrayList<>();
            Quote seed = byScore.get(seedIdx);
            selected.add(seed);

            double usedCbm = safeCbm(seed);
            double usedWeight = safeWeight(seed);

            for (int i = 0; i < byScore.size(); i++) {
                if (i == seedIdx || selected.size() >= maxCombine) {
                    continue;
                }
                Quote q = byScore.get(i);
                double nextCbm = usedCbm + safeCbm(q);
                double nextWeight = usedWeight + safeWeight(q);
                if (!driverState.canLoad(nextCbm, nextWeight)) {
                    continue;
                }
                List<Quote> next = new ArrayList<>(selected);
                next.add(q);
                if (!canMeetSchedulesInAnyOrder(current, next)) {
                    continue;
                }
                selected = next;
                usedCbm = nextCbm;
                usedWeight = nextWeight;
                if (selected.size() >= 2) {
                    addIfNew(result, seen, selected);
                }
            }
        }
        return result;
    }

    private boolean canLoad(DriverState driverState, List<Quote> quotes) {
        return driverState.canLoad(totalCbm(quotes), totalWeight(quotes));
    }

    private boolean canMeetSchedulesInAnyOrder(Place current, List<Quote> quotes) {
        boolean hasSchedule = quotes.stream().anyMatch(Quote::hasDeliverySchedule);
        if (!hasSchedule) {
            return true;
        }
        return canMeetSchedulesByPermutation(current, new ArrayList<>(quotes), 0);
    }

    private boolean canMeetSchedulesByPermutation(Place current, List<Quote> quotes, int index) {
        if (index == quotes.size()) {
            return candidateFilterService.canMeetAllSchedules(current, quotes);
        }

        for (int i = index; i < quotes.size(); i++) {
            swap(quotes, index, i);
            boolean ok = canMeetSchedulesByPermutation(current, quotes, index + 1);
            swap(quotes, index, i);
            if (ok) {
                return true;
            }
        }
        return false;
    }

    private void swap(List<Quote> quotes, int a, int b) {
        Quote temp = quotes.get(a);
        quotes.set(a, quotes.get(b));
        quotes.set(b, temp);
    }

    private void addIfNew(List<List<Quote>> combos, Set<String> seen, List<Quote> combo) {
        String key = combinationKey(combo);
        if (!seen.contains(key)) {
            seen.add(key);
            combos.add(new ArrayList<>(combo));
        }
    }

    private List<List<Quote>> mergeWithoutDuplicate(List<List<Quote>> a, List<List<Quote>> b) {
        List<List<Quote>> merged = new ArrayList<>();
        Set<String> seen = new HashSet<>();

        for (List<Quote> combo : a) {
            addIfNew(merged, seen, combo);
        }
        for (List<Quote> combo : b) {
            addIfNew(merged, seen, combo);
        }
        return merged;
    }

    private String combinationKey(List<Quote> quotes) {
        return quotes.stream()
                .map(q -> q.quoteId().toString())
                .sorted()
                .collect(Collectors.joining(","));
    }

    private double averagePairwisePickupDistance(Place current, List<Quote> selected) {
        if (selected.size() <= 1) {
            return 0.0;
        }

        double sum = 0.0;
        int count = 0;
        for (int i = 0; i < selected.size(); i++) {
            for (int j = i + 1; j < selected.size(); j++) {
                Quote a = selected.get(i);
                Quote b = selected.get(j);
                sum += candidateFilterService.haversineDistance(
                        a.origin().latitude(), a.origin().longitude(),
                        b.origin().latitude(), b.origin().longitude()
                );
                count++;
            }
        }
        if (current != null) {
            for (Quote q : selected) {
                sum += candidateFilterService.haversineDistance(
                        current.latitude(), current.longitude(),
                        q.origin().latitude(), q.origin().longitude()
                );
                count++;
            }
        }
        return count == 0 ? 0.0 : (sum / count);
    }

    private record BeamState(
            List<Quote> selected,
            int nextStartIndex,
            double usedCbm,
            double usedWeight,
            double score
    ) {
    }

    private double safeCbm(Quote quote) {
        return quote.volumeCbm() != null ? quote.volumeCbm() : 0.0;
    }

    private double safeWeight(Quote quote) {
        return quote.weightKg() != null ? quote.weightKg() : 0.0;
    }

    public double totalCbm(List<Quote> quotes) {
        return quotes.stream()
                .mapToDouble(this::safeCbm)
                .sum();
    }

    public double totalWeight(List<Quote> quotes) {
        return quotes.stream()
                .mapToDouble(this::safeWeight)
                .sum();
    }

    public double totalRevenue(List<Quote> quotes) {
        return quotes.stream()
                .mapToDouble(q -> q.finalPrice() != null ? q.finalPrice() : 0.0)
                .sum();
    }

    public int estimateCombinationCount(int candidateCount, int maxCombine) {
        int count = candidateCount;

        if (maxCombine >= 2) {
            count += candidateCount * (candidateCount - 1) / 2;
        }
        if (maxCombine >= 3) {
            count += candidateCount * (candidateCount - 1) * (candidateCount - 2) / 6;
        }
        return count;
    }
}
