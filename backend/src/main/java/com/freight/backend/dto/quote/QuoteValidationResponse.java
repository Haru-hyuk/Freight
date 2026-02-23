package com.freight.backend.dto.quote;

import java.util.List;
import lombok.Builder;
import lombok.AllArgsConstructor;
import lombok.Getter;

@Getter
@AllArgsConstructor
@Builder
public class QuoteValidationResponse {
    public enum OverallStatus {
        GOOD, NORMAL, RISKY
    }

    public enum DispatchSpeed {
        FAST, NORMAL, SLOW
    }

    public enum LoadSafety {
        SAFE, WARN, RISK
    }

    public enum PriceFit {
        LOW, NORMAL, HIGH
    }

    @Getter
    @AllArgsConstructor
    @Builder
    public static class LoadAnalysis {
        private Integer currentKg;
        private Integer capacityKg;
        private Integer usagePercent;
        private LoadSafety safety;
        private String label;
    }

    @Getter
    @AllArgsConstructor
    @Builder
    public static class PriceAnalysis {
        private Integer userDesiredPrice;
        private int minPrice;
        private int maxPrice;
        private int weightedPrice;
        private int suggestedPrice;
        private PriceFit fit;
        private String label;
    }

    private int estimatedMinPrice;
    private int estimatedMaxPrice;
    private int estimatedWeightedPrice;
    private List<String> comments;

    private OverallStatus overallStatus;
    private DispatchSpeed dispatchSpeed;
    private String badge;
    private LoadAnalysis loadAnalysis;
    private PriceAnalysis priceAnalysis;
    private double confidence;
    private String aiSummary;
    private List<String> reasons;
    private List<String> actions;
}
