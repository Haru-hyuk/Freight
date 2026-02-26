package com.freight.backend.gpsload.routeassembly.entity;

import com.freight.backend.gpsload.routeassembly.model.RecommendedRoute;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;

import java.time.LocalDateTime;
import java.util.stream.Collectors;

@Entity
@Table(name = "route_recommendation_feedback")
public class RouteRecommendationFeedback {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "feedback_id")
    private Long feedbackId;

    @Column(name = "calibration_id", nullable = false, unique = true, length = 64)
    private String calibrationId;

    @Column(name = "quote_ids_csv", length = 1000)
    private String quoteIdsCsv;

    @Column(name = "route_type", length = 32)
    private String routeType;

    @Column(name = "consolidation_score", nullable = false)
    private Double consolidationScore;

    @Column(name = "profit_score", nullable = false)
    private Double profitScore;

    @Column(name = "route_score", nullable = false)
    private Double routeScore;

    @Column(name = "final_score", nullable = false)
    private Double finalScore;

    @Column(name = "accepted")
    private Boolean accepted;

    @Column(name = "completed_on_time")
    private Boolean completedOnTime;

    @Column(name = "cancelled")
    private Boolean cancelled;

    @Column(name = "realized_profit")
    private Double realizedProfit;

    @Column(name = "note", length = 500)
    private String note;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    protected RouteRecommendationFeedback() {
    }

    public static RouteRecommendationFeedback fromRecommendation(
            String calibrationId,
            RecommendedRoute route
    ) {
        RouteRecommendationFeedback feedback = new RouteRecommendationFeedback();
        feedback.calibrationId = calibrationId;
        feedback.quoteIdsCsv = route.quoteIds() == null
                ? ""
                : route.quoteIds().stream().map(String::valueOf).collect(Collectors.joining(","));
        feedback.routeType = route.routeType() == null ? null : route.routeType().name();
        feedback.consolidationScore = route.scoreBreakdown() == null ? 0.0 : route.scoreBreakdown().consolidationScore();
        feedback.profitScore = route.scoreBreakdown() == null ? 0.0 : route.scoreBreakdown().profitScore();
        feedback.routeScore = route.scoreBreakdown() == null ? 0.0 : route.scoreBreakdown().routeScore();
        feedback.finalScore = route.finalScore();
        return feedback;
    }

    @PrePersist
    protected void onCreate() {
        LocalDateTime now = LocalDateTime.now();
        createdAt = now;
        updatedAt = now;
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }

    public void applyOutcome(
            Boolean accepted,
            Boolean completedOnTime,
            Boolean cancelled,
            Double realizedProfit,
            String note
    ) {
        if (accepted != null) {
            this.accepted = accepted;
        }
        if (completedOnTime != null) {
            this.completedOnTime = completedOnTime;
        }
        if (cancelled != null) {
            this.cancelled = cancelled;
        }
        if (realizedProfit != null) {
            this.realizedProfit = realizedProfit;
        }
        if (note != null && !note.isBlank()) {
            this.note = note.trim();
        }
    }

    public boolean hasOutcome() {
        return accepted != null
                || completedOnTime != null
                || cancelled != null
                || realizedProfit != null;
    }

    public Long getFeedbackId() {
        return feedbackId;
    }

    public String getCalibrationId() {
        return calibrationId;
    }

    public String getQuoteIdsCsv() {
        return quoteIdsCsv;
    }

    public String getRouteType() {
        return routeType;
    }

    public Double getConsolidationScore() {
        return consolidationScore;
    }

    public Double getProfitScore() {
        return profitScore;
    }

    public Double getRouteScore() {
        return routeScore;
    }

    public Double getFinalScore() {
        return finalScore;
    }

    public Boolean getAccepted() {
        return accepted;
    }

    public Boolean getCompletedOnTime() {
        return completedOnTime;
    }

    public Boolean getCancelled() {
        return cancelled;
    }

    public Double getRealizedProfit() {
        return realizedProfit;
    }

    public String getNote() {
        return note;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public LocalDateTime getUpdatedAt() {
        return updatedAt;
    }
}

