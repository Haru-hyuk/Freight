package com.freight.backend.gpsmiss.routeassembly.model;

import java.util.List;

/**
 * Score breakdown with weighted components and explainability signals.
 */
public record ScoreBreakdown(
        double consolidationScore,
        double profitScore,
        double routeScore,
        double consolidationWeighted,
        double profitWeighted,
        double routeWeighted,
        String description,

        // XAI / risk signals
        double expectedUtilityFactor,
        double acceptProbability,
        double onTimeProbability,
        double modelConfidence,
        String decisionSource,
        double schedulePenalty,
        double riskPenalty,
        List<String> topFactors
) {

    public double totalScore() {
        return consolidationWeighted + profitWeighted + routeWeighted;
    }

    public static ScoreBreakdown of(
            double consolidation,
            double profit,
            double route,
            double consWeight,
            double profWeight,
            double routWeight,
            String description
    ) {
        return ofDetailed(
                consolidation,
                profit,
                route,
                consWeight,
                profWeight,
                routWeight,
                description,
                1.0,
                1.0,
                1.0,
                0.0,
                "HEURISTIC",
                0.0,
                0.0,
                List.of()
        );
    }

    public static ScoreBreakdown ofDetailed(
            double consolidation,
            double profit,
            double route,
            double consWeight,
            double profWeight,
            double routWeight,
            String description,
            double expectedUtilityFactor,
            double acceptProbability,
            double onTimeProbability,
            double modelConfidence,
            String decisionSource,
            double schedulePenalty,
            double riskPenalty,
            List<String> topFactors
    ) {
        return new ScoreBreakdown(
                consolidation,
                profit,
                route,
                consolidation * consWeight,
                profit * profWeight,
                route * routWeight,
                description,
                expectedUtilityFactor,
                acceptProbability,
                onTimeProbability,
                modelConfidence,
                decisionSource,
                schedulePenalty,
                riskPenalty,
                topFactors == null ? List.of() : List.copyOf(topFactors)
        );
    }
}
