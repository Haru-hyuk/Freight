package com.freight.backend.gpsload.routeassembly.service;

import com.freight.backend.gpsload.route.model.Place;
import com.freight.backend.gpsload.routeassembly.model.AssemblyParameters;
import com.freight.backend.gpsload.routeassembly.model.DriverState;
import com.freight.backend.gpsload.routeassembly.model.Quote;
import com.freight.backend.gpsload.routeassembly.model.RecommendedRoute;
import com.freight.backend.gpsload.routeassembly.model.ScoreBreakdown;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.time.LocalDateTime;
import java.util.List;

@Service
public class ScoringService {

    private static final double CLUSTER_BONUS_MAX = 15.0;
    private static final double SCHEDULE_VIOLATION_HARD_PENALTY = 30.0;
    private static final double MIN_EXPECTED_UTILITY_FACTOR = 0.35;

    private final CombinationGeneratorService combinationGeneratorService;
    private final RouteDecisionIntelligenceService routeDecisionIntelligenceService;
    private final RouteScoringCalibrationService routeScoringCalibrationService;

    public ScoringService(
            CombinationGeneratorService combinationGeneratorService,
            RouteDecisionIntelligenceService routeDecisionIntelligenceService,
            RouteScoringCalibrationService routeScoringCalibrationService
    ) {
        this.combinationGeneratorService = combinationGeneratorService;
        this.routeDecisionIntelligenceService = routeDecisionIntelligenceService;
        this.routeScoringCalibrationService = routeScoringCalibrationService;
    }

    public record ScoringResult(
            double finalScore,
            ScoreBreakdown breakdown,
            double estimatedProfit,
            double profitPerKm
    ) {
    }

    public ScoringResult calculateScore(
            DriverState driverState,
            List<Quote> quotes,
            RouteSimulationService.SimulationResult simulation,
            AssemblyParameters params
    ) {
        double consolidationScore = calculateConsolidationScore(driverState, quotes);

        double totalRevenue = combinationGeneratorService.totalRevenue(quotes);
        double estimatedCost = calculateEstimatedCost(simulation, params);
        double rawProfit = totalRevenue - estimatedCost;
        double rawProfitPerKm = simulation.totalDistanceM() > 0
                ? rawProfit / (simulation.totalDistanceM() / 1000.0)
                : 0.0;

        RouteDecisionIntelligenceService.DecisionSignals signals =
                routeDecisionIntelligenceService.evaluate(driverState, quotes, simulation);
        // Expected utility factor lowers optimistic score when delay/acceptance risk is high.
        double expectedUtilityFactor = Math.max(MIN_EXPECTED_UTILITY_FACTOR, signals.expectedUtilityFactor());
        double expectedProfit = rawProfit * expectedUtilityFactor;
        double expectedProfitPerKm = simulation.totalDistanceM() > 0
                ? expectedProfit / (simulation.totalDistanceM() / 1000.0)
                : 0.0;

        double profitScore = calculateProfitScore(expectedProfit, expectedProfitPerKm);
        double routeScore = calculateRouteScore(simulation);
        double urgencyBonus = calculateUrgencyBonus(quotes);
        PenaltyResult penalties = calculateHardConstraintPenalty(simulation, expectedUtilityFactor);
        RouteScoringCalibrationService.WeightProfile weights =
                routeScoringCalibrationService.resolveWeights(params);

        ScoreBreakdown breakdown = ScoreBreakdown.ofDetailed(
                consolidationScore,
                Math.max(0.0, profitScore + urgencyBonus),
                routeScore,
                weights.consolidationWeight(),
                weights.profitWeight(),
                weights.routeWeight(),
                generateScoreDescription(
                        quotes.size(),
                        rawProfit,
                        simulation.totalDistanceM(),
                        expectedUtilityFactor,
                        simulation.scheduleViolations(),
                        signals
                ),
                expectedUtilityFactor,
                signals.acceptProbability(),
                signals.onTimeProbability(),
                signals.confidence(),
                signals.source(),
                penalties.schedulePenalty(),
                penalties.riskPenalty(),
                buildTopFactors(simulation, signals, expectedUtilityFactor, weights)
        );

        double finalScore = Math.max(0.0, breakdown.totalScore() - penalties.totalPenalty());

        return new ScoringResult(
                finalScore,
                breakdown,
                rawProfit,
                rawProfitPerKm
        );
    }

    private double calculateConsolidationScore(DriverState driverState, List<Quote> quotes) {
        double totalCbm = combinationGeneratorService.totalCbm(quotes);
        double totalWeight = combinationGeneratorService.totalWeight(quotes);

        double cbmUtilization = 0.0;
        double weightUtilization = 0.0;

        if (driverState.remainingCbm() != null && driverState.remainingCbm() > 0) {
            cbmUtilization = Math.min(100.0, (totalCbm / driverState.remainingCbm()) * 100.0);
        }
        if (driverState.remainingWeight() != null && driverState.remainingWeight() > 0) {
            weightUtilization = Math.min(100.0, (totalWeight / driverState.remainingWeight()) * 100.0);
        }

        double utilizationScore = (cbmUtilization + weightUtilization) / 2.0;
        double balancePenalty = Math.abs(cbmUtilization - weightUtilization) * 0.25;

        int cargoCount = quotes.size();
        // 다건 조합 보너스: 선형 증가 (2건=10점, 3건=18점, 4건=26점, ..., 최대 50점)
        // 더 많은 화물 조합을 유도하여 효율성 향상
        double countBonus = 0.0;
        if (cargoCount == 2) {
            countBonus = 10.0;
        } else if (cargoCount >= 3) {
            // 3개 이상: 10 + (cargoCount - 2) * 8, 최대 50점
            countBonus = Math.min(50.0, 10.0 + (cargoCount - 2) * 8.0);
        }

        double clusterBonus = calculateClusterBonus(quotes);
        double adjusted = utilizationScore - balancePenalty + countBonus + clusterBonus;
        return Math.max(0.0, Math.min(100.0, adjusted));
    }

    private double calculateProfitScore(double expectedProfit, double expectedProfitPerKm) {
        double profitScore = Math.min(50.0, (expectedProfit / 100000.0) * 50.0);
        double perKmScore = Math.min(50.0, (expectedProfitPerKm / 1000.0) * 50.0);
        return profitScore + perKmScore;
    }

    private double calculateRouteScore(RouteSimulationService.SimulationResult simulation) {
        double emptyRunRatio = simulation.totalDistanceM() > 0
                ? (double) simulation.emptyRunDistanceM() / simulation.totalDistanceM()
                : 0.0;
        double emptyRunScore = Math.max(0.0, 50.0 - (emptyRunRatio * 100.0));

        double deviationKm = simulation.routeDeviationM() / 1000.0;
        double deviationScore = Math.max(0.0, 50.0 - (deviationKm * 10.0));

        return emptyRunScore + deviationScore;
    }

    private PenaltyResult calculateHardConstraintPenalty(
            RouteSimulationService.SimulationResult simulation,
            double expectedUtilityFactor
    ) {
        double schedulePenalty = simulation.scheduleViolations() * SCHEDULE_VIOLATION_HARD_PENALTY;
        double riskPenalty = Math.max(0.0, (1.0 - expectedUtilityFactor) * 20.0);
        return new PenaltyResult(schedulePenalty, riskPenalty, schedulePenalty + riskPenalty);
    }

    private List<String> buildTopFactors(
            RouteSimulationService.SimulationResult simulation,
            RouteDecisionIntelligenceService.DecisionSignals signals,
            double expectedUtilityFactor,
            RouteScoringCalibrationService.WeightProfile weights
    ) {
        List<String> factors = new ArrayList<>();
        if (signals.topFactors() != null && !signals.topFactors().isEmpty()) {
            factors.addAll(signals.topFactors());
        }
        if (simulation.scheduleViolations() > 0) {
            factors.add("schedule_violations=" + simulation.scheduleViolations());
        }
        if (simulation.totalDistanceM() > 0) {
            double emptyRunRatio = (double) simulation.emptyRunDistanceM() / simulation.totalDistanceM();
            factors.add(String.format("empty_run_ratio=%.3f", emptyRunRatio));
        }
        factors.add(String.format("route_deviation_km=%.2f", simulation.routeDeviationM() / 1000.0));
        factors.add(String.format("p_accept=%.2f", signals.acceptProbability()));
        factors.add(String.format("p_on_time=%.2f", signals.onTimeProbability()));
        factors.add(String.format("utility_factor=%.2f", expectedUtilityFactor));
        factors.add(String.format("w_cons=%.3f", weights.consolidationWeight()));
        factors.add(String.format("w_profit=%.3f", weights.profitWeight()));
        factors.add(String.format("w_route=%.3f", weights.routeWeight()));
        factors.add("weight_calibrated=" + weights.calibrated());
        if (signals.reason() != null && !signals.reason().isBlank()) {
            factors.add("reason=" + signals.reason());
        }
        return factors.stream().limit(6).toList();
    }

    private double calculateUrgencyBonus(List<Quote> quotes) {
        LocalDateTime now = LocalDateTime.now();
        long minMinutes = Long.MAX_VALUE;

        for (Quote q : quotes) {
            if (q.hasScheduledDate()) {
                long remaining = q.minutesUntilScheduled(now);
                if (remaining >= 0 && remaining < minMinutes) {
                    minMinutes = remaining;
                }
            }
        }

        if (minMinutes == Long.MAX_VALUE) return 0.0;
        if (minMinutes <= 120) return 15.0;
        if (minMinutes <= 240) return 10.0;
        if (minMinutes <= 480) return 5.0;
        return 0.0;
    }

    private double calculateClusterBonus(List<Quote> quotes) {
        if (quotes == null || quotes.size() < 2) {
            return 0.0;
        }

        double avgPickupKm = averagePairwiseDistanceKm(quotes, true);
        double avgDropKm = averagePairwiseDistanceKm(quotes, false);
        if (avgPickupKm < 0 || avgDropKm < 0) {
            return 0.0;
        }

        double pickupBonus = Math.max(0.0, 8.0 - (avgPickupKm * 0.4));
        double dropBonus = Math.max(0.0, 7.0 - (avgDropKm * 0.35));
        return Math.min(CLUSTER_BONUS_MAX, pickupBonus + dropBonus);
    }

    private double averagePairwiseDistanceKm(List<Quote> quotes, boolean pickup) {
        double total = 0.0;
        int count = 0;

        for (int i = 0; i < quotes.size(); i++) {
            Place a = pickup ? quotes.get(i).origin() : quotes.get(i).destination();
            if (a == null || a.latitude() == null || a.longitude() == null) {
                continue;
            }
            for (int j = i + 1; j < quotes.size(); j++) {
                Place b = pickup ? quotes.get(j).origin() : quotes.get(j).destination();
                if (b == null || b.latitude() == null || b.longitude() == null) {
                    continue;
                }
                total += haversineKm(a.latitude(), a.longitude(), b.latitude(), b.longitude());
                count++;
            }
        }

        return count == 0 ? -1.0 : (total / count);
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

    private String generateScoreDescription(
            int cargoCount,
            double profit,
            int distanceM,
            double expectedUtilityFactor,
            int scheduleViolations,
            RouteDecisionIntelligenceService.DecisionSignals signals
    ) {
        StringBuilder desc = new StringBuilder();
        if (cargoCount == 1) {
            desc.append("single");
        } else {
            desc.append(cargoCount).append("-bundle");
        }

        desc.append(" | profit: ").append(String.format("%,.0f", profit));
        desc.append(" | distance: ").append(String.format("%.1fkm", distanceM / 1000.0));
        desc.append(" | utility: ").append(String.format("%.2f", expectedUtilityFactor));
        desc.append(" | pAccept: ").append(String.format("%.2f", signals.acceptProbability()));
        desc.append(" | pOnTime: ").append(String.format("%.2f", signals.onTimeProbability()));
        desc.append(" | source: ").append(signals.source());
        if (scheduleViolations > 0) {
            desc.append(" | schedule-violations: ").append(scheduleViolations);
        }
        if (signals.reason() != null && !signals.reason().isBlank()) {
            desc.append(" | reason: ").append(signals.reason());
        }
        return desc.toString();
    }

    public RecommendedRoute.RouteType determineRouteType(
            DriverState driverState,
            List<Quote> quotes
    ) {
        if (quotes.size() == 1) {
            return RecommendedRoute.RouteType.SINGLE;
        }
        if (driverState.combinePreference() == DriverState.CombinePreference.HOME_ROUTE) {
            return RecommendedRoute.RouteType.HOME_ROUTE;
        }
        return RecommendedRoute.RouteType.BUNDLED;
    }

    public double calculateCbmUtilization(DriverState driverState, List<Quote> quotes) {
        if (driverState.remainingCbm() == null || driverState.remainingCbm() <= 0) {
            return 0.0;
        }
        double totalCbm = combinationGeneratorService.totalCbm(quotes);
        return (totalCbm / driverState.remainingCbm()) * 100.0;
    }

    public double calculateWeightUtilization(DriverState driverState, List<Quote> quotes) {
        if (driverState.remainingWeight() == null || driverState.remainingWeight() <= 0) {
            return 0.0;
        }
        double totalWeight = combinationGeneratorService.totalWeight(quotes);
        return (totalWeight / driverState.remainingWeight()) * 100.0;
    }

    private record PenaltyResult(
            double schedulePenalty,
            double riskPenalty,
            double totalPenalty
    ) {
    }
}
