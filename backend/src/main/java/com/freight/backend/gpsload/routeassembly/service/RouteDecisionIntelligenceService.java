package com.freight.backend.gpsload.routeassembly.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.freight.backend.ai.DeepSeekClient;
import com.freight.backend.gpsload.routeassembly.model.DriverState;
import com.freight.backend.gpsload.routeassembly.model.Quote;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Optional;
import java.util.Set;

@Service
public class RouteDecisionIntelligenceService {

    private static final double MIN_PROBABILITY = 0.05;
    private static final double MAX_PROBABILITY = 0.99;

    private final DeepSeekClient deepSeekClient;
    private final ObjectMapper objectMapper;

    public RouteDecisionIntelligenceService(DeepSeekClient deepSeekClient) {
        this.deepSeekClient = deepSeekClient;
        this.objectMapper = new ObjectMapper();
    }

    public DecisionSignals evaluate(
            DriverState driverState,
            List<Quote> quotes,
            RouteSimulationService.SimulationResult simulation
    ) {
        DecisionSignals heuristic = heuristicSignals(driverState, quotes, simulation);
        Optional<DeepSeekSignals> deepSeek = requestDeepSeekSignals(driverState, quotes, simulation);
        if (deepSeek.isEmpty()) {
            return heuristic;
        }

        DeepSeekSignals ds = deepSeek.get();
        double blend = clamp(ds.confidence(), 0.0, 1.0) * 0.5;
        double accept = mix(heuristic.acceptProbability(), ds.acceptProbability(), blend);
        double onTime = mix(heuristic.onTimeProbability(), ds.onTimeProbability(), blend);
        double confidence = Math.max(heuristic.confidence(), ds.confidence());
        String reason = ds.reason() != null && !ds.reason().isBlank()
                ? ds.reason()
                : heuristic.reason();

        List<String> factors = mergeTopFactors(heuristic.topFactors(), ds.topFactors());

        return new DecisionSignals(
                clamp(accept, MIN_PROBABILITY, MAX_PROBABILITY),
                clamp(onTime, MIN_PROBABILITY, MAX_PROBABILITY),
                clamp(confidence, 0.0, 1.0),
                "HYBRID",
                reason,
                factors
        );
    }

    private DecisionSignals heuristicSignals(
            DriverState driverState,
            List<Quote> quotes,
            RouteSimulationService.SimulationResult simulation
    ) {
        double emptyRunRatio = simulation.totalDistanceM() > 0
                ? (double) simulation.emptyRunDistanceM() / simulation.totalDistanceM()
                : 1.0;
        double deviationKm = simulation.routeDeviationM() / 1000.0;
        int cargoCount = quotes != null ? quotes.size() : 0;

        double accept = 0.92;
        if (cargoCount > 1) {
            accept -= (cargoCount - 1) * 0.06;
        }
        accept -= Math.min(0.25, emptyRunRatio * 0.30);
        accept -= Math.min(0.15, deviationKm / 100.0);
        if (driverState != null && driverState.combinePreference() == DriverState.CombinePreference.HOME_ROUTE) {
            accept += 0.03;
        }
        accept = clamp(accept, MIN_PROBABILITY, MAX_PROBABILITY);

        double onTime = 0.95;
        onTime -= simulation.scheduleViolations() * 0.18;
        onTime -= Math.min(0.10, emptyRunRatio * 0.10);
        onTime -= urgencyPenalty(quotes);
        onTime = clamp(onTime, MIN_PROBABILITY, MAX_PROBABILITY);

        String reason = buildHeuristicReason(cargoCount, simulation, emptyRunRatio, deviationKm);
        List<String> factors = buildHeuristicFactors(driverState, simulation, emptyRunRatio, deviationKm, cargoCount);
        return new DecisionSignals(accept, onTime, 0.55, "HEURISTIC", reason, factors);
    }

    private List<String> buildHeuristicFactors(
            DriverState driverState,
            RouteSimulationService.SimulationResult simulation,
            double emptyRunRatio,
            double deviationKm,
            int cargoCount
    ) {
        List<String> factors = new ArrayList<>();
        factors.add(String.format("empty_run_ratio=%.3f", emptyRunRatio));
        factors.add(String.format("route_deviation_km=%.2f", deviationKm));
        factors.add("schedule_violations=" + simulation.scheduleViolations());
        factors.add("cargo_count=" + cargoCount);
        if (driverState != null && driverState.combinePreference() != null) {
            factors.add("combine_pref=" + driverState.combinePreference().name());
        }
        return factors;
    }

    private List<String> mergeTopFactors(List<String> heuristic, List<String> deepSeek) {
        Set<String> merged = new LinkedHashSet<>();
        if (deepSeek != null && !deepSeek.isEmpty()) {
            for (String factor : deepSeek) {
                if (factor != null && !factor.isBlank()) {
                    merged.add(factor.trim());
                }
            }
        }
        if (heuristic != null && !heuristic.isEmpty()) {
            for (String factor : heuristic) {
                if (factor != null && !factor.isBlank()) {
                    merged.add(factor.trim());
                }
            }
        }
        return merged.stream().limit(6).toList();
    }

    private double urgencyPenalty(List<Quote> quotes) {
        if (quotes == null || quotes.isEmpty()) {
            return 0.0;
        }
        LocalDateTime now = LocalDateTime.now();
        long minMinutes = Long.MAX_VALUE;
        for (Quote q : quotes) {
            if (!q.hasDeliverySchedule()) {
                continue;
            }
            long remain = q.minutesUntilDeliverySchedule(now);
            if (remain >= 0 && remain < minMinutes) {
                minMinutes = remain;
            }
        }
        if (minMinutes == Long.MAX_VALUE) {
            return 0.0;
        }
        if (minMinutes <= 120) {
            return 0.12;
        }
        if (minMinutes <= 240) {
            return 0.08;
        }
        if (minMinutes <= 480) {
            return 0.04;
        }
        return 0.0;
    }

    private String buildHeuristicReason(
            int cargoCount,
            RouteSimulationService.SimulationResult simulation,
            double emptyRunRatio,
            double deviationKm
    ) {
        if (simulation.scheduleViolations() > 0) {
            return "Schedule violation risk exists; recommendation was down-weighted.";
        }
        if (emptyRunRatio > 0.35) {
            return "Empty-run ratio is high; recommendation prefers lower repositioning routes.";
        }
        if (deviationKm > 20.0) {
            return "Route deviation from target path is large; recommendation penalizes detour.";
        }
        if (cargoCount >= 2) {
            return "Pickup clustering and delivery order were optimized to reduce backtracking.";
        }
        return "Single-cargo route with stable expected on-time performance.";
    }

    private Optional<DeepSeekSignals> requestDeepSeekSignals(
            DriverState driverState,
            List<Quote> quotes,
            RouteSimulationService.SimulationResult simulation
    ) {
        String systemPrompt = """
                You are a dispatch risk analyst.
                Return ONLY JSON.
                Schema:
                {
                  "acceptProbability": number(0..1),
                  "onTimeProbability": number(0..1),
                  "confidence": number(0..1),
                  "reason": string,
                  "topFactors": [string]
                }
                """;

        String userPrompt = buildDeepSeekInput(driverState, quotes, simulation);
        Optional<String> response = deepSeekClient.generateText(systemPrompt, userPrompt, 0.1, 280);
        if (response.isEmpty()) {
            return Optional.empty();
        }

        try {
            String sanitized = stripMarkdownFence(response.get());
            JsonNode root = objectMapper.readTree(sanitized);
            double accept = clamp(root.path("acceptProbability").asDouble(Double.NaN), MIN_PROBABILITY, MAX_PROBABILITY);
            double onTime = clamp(root.path("onTimeProbability").asDouble(Double.NaN), MIN_PROBABILITY, MAX_PROBABILITY);
            double confidence = clamp(root.path("confidence").asDouble(0.0), 0.0, 1.0);
            String reason = root.path("reason").asText("");
            List<String> topFactors = parseTopFactors(root.path("topFactors"));
            if (Double.isNaN(accept) || Double.isNaN(onTime)) {
                return Optional.empty();
            }
            return Optional.of(new DeepSeekSignals(accept, onTime, confidence, reason, topFactors));
        } catch (Exception ignored) {
            return Optional.empty();
        }
    }

    private List<String> parseTopFactors(JsonNode node) {
        if (node == null || !node.isArray()) {
            return List.of();
        }
        List<String> factors = new ArrayList<>();
        for (JsonNode factorNode : node) {
            if (factorNode == null) {
                continue;
            }
            String factor = factorNode.asText("");
            if (!factor.isBlank()) {
                factors.add(factor.trim());
            }
        }
        return factors.stream().limit(6).toList();
    }

    private String buildDeepSeekInput(
            DriverState driverState,
            List<Quote> quotes,
            RouteSimulationService.SimulationResult simulation
    ) {
        int quoteCount = quotes != null ? quotes.size() : 0;
        long scheduledCount = quotes != null ? quotes.stream().filter(Quote::hasDeliverySchedule).count() : 0;
        String combinePreference = driverState != null && driverState.combinePreference() != null
                ? driverState.combinePreference().name()
                : "UNKNOWN";

        return """
                Dispatch candidate summary:
                - quoteCount: %d
                - scheduledCount: %d
                - combinePreference: %s
                - totalDistanceM: %d
                - emptyRunDistanceM: %d
                - routeDeviationM: %d
                - scheduleViolations: %d
                """.formatted(
                quoteCount,
                scheduledCount,
                combinePreference,
                simulation.totalDistanceM(),
                simulation.emptyRunDistanceM(),
                simulation.routeDeviationM(),
                simulation.scheduleViolations()
        );
    }

    private String stripMarkdownFence(String raw) {
        String trimmed = raw == null ? "" : raw.trim();
        if (!trimmed.startsWith("```")) {
            return trimmed;
        }
        String noStart = trimmed.replaceFirst("^```[a-zA-Z]*\\s*", "");
        return noStart.replaceFirst("\\s*```$", "").trim();
    }

    private double clamp(double value, double min, double max) {
        if (Double.isNaN(value)) {
            return min;
        }
        return Math.max(min, Math.min(max, value));
    }

    private double mix(double a, double b, double blend) {
        return (a * (1.0 - blend)) + (b * blend);
    }

    private record DeepSeekSignals(
            double acceptProbability,
            double onTimeProbability,
            double confidence,
            String reason,
            List<String> topFactors
    ) {
    }

    public record DecisionSignals(
            double acceptProbability,
            double onTimeProbability,
            double confidence,
            String source,
            String reason,
            List<String> topFactors
    ) {
        public double expectedUtilityFactor() {
            return acceptProbability * onTimeProbability;
        }
    }
}
