package com.freight.backend.gpsload.routeassembly.service;

import com.freight.backend.gpsload.routeassembly.entity.RouteRecommendationFeedback;
import com.freight.backend.gpsload.routeassembly.model.AssemblyParameters;
import com.freight.backend.gpsload.routeassembly.model.RecommendedRoute;
import com.freight.backend.gpsload.routeassembly.model.RouteCalibrationFeedbackRequest;
import com.freight.backend.gpsload.routeassembly.model.RouteCalibrationStatusResponse;
import com.freight.backend.gpsload.routeassembly.repository.RouteRecommendationFeedbackRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Service
public class RouteScoringCalibrationService {

    private final RouteRecommendationFeedbackRepository feedbackRepository;

    @Value("${route-assembly.calibration.enabled:true}")
    private boolean calibrationEnabled;

    @Value("${route-assembly.calibration.min-samples:50}")
    private int minSamples;

    @Value("${route-assembly.calibration.lookback-samples:1000}")
    private int lookbackSamples;

    @Value("${route-assembly.calibration.smoothing-factor:0.35}")
    private double smoothingFactor;

    @Value("${route-assembly.calibration.max-step:0.20}")
    private double maxStep;

    private volatile WeightProfile cachedProfile;

    public RouteScoringCalibrationService(RouteRecommendationFeedbackRepository feedbackRepository) {
        this.feedbackRepository = feedbackRepository;
    }

    public WeightProfile resolveWeights(AssemblyParameters params) {
        WeightProfile defaultProfile = WeightProfile.defaults(params, calibrationEnabled, minSamples, lookbackSamples);
        if (!calibrationEnabled) {
            return defaultProfile;
        }

        WeightProfile profile = cachedProfile;
        if (profile == null) {
            profile = recompute(params);
        }
        return profile != null ? profile : defaultProfile;
    }

    @Transactional
    public List<RecommendedRoute> attachCalibrationIds(List<RecommendedRoute> routes) {
        if (routes == null || routes.isEmpty()) {
            return List.of();
        }

        List<RecommendedRoute> attached = new ArrayList<>(routes.size());
        for (RecommendedRoute route : routes) {
            if (route == null) {
                continue;
            }
            String calibrationId = route.calibrationId();
            if (calibrationId == null || calibrationId.isBlank()) {
                calibrationId = generateCalibrationId();
            }

            RouteRecommendationFeedback entity =
                    RouteRecommendationFeedback.fromRecommendation(calibrationId, route);
            feedbackRepository.save(entity);
            attached.add(route.withCalibrationId(calibrationId));
        }
        return attached;
    }

    @Transactional
    public RouteCalibrationStatusResponse applyFeedback(RouteCalibrationFeedbackRequest request) {
        if (request == null || !request.isValid()) {
            return status(AssemblyParameters.defaults(), "invalid feedback request");
        }

        RouteRecommendationFeedback feedback = feedbackRepository.findByCalibrationId(request.calibrationId())
                .orElse(null);
        if (feedback == null) {
            return status(AssemblyParameters.defaults(), "calibration_id not found: " + request.calibrationId());
        }

        feedback.applyOutcome(
                request.accepted(),
                request.completedOnTime(),
                request.cancelled(),
                request.realizedProfit(),
                request.note()
        );
        feedbackRepository.save(feedback);
        WeightProfile profile = recompute(AssemblyParameters.defaults());
        return toStatusResponse(profile);
    }

    @Transactional(readOnly = true)
    public RouteCalibrationStatusResponse status(AssemblyParameters params) {
        WeightProfile profile = cachedProfile;
        if (profile == null) {
            profile = WeightProfile.defaults(params, calibrationEnabled, minSamples, lookbackSamples);
        }
        return toStatusResponse(profile);
    }

    @Transactional
    public RouteCalibrationStatusResponse recomputeNow(AssemblyParameters params) {
        WeightProfile profile = recompute(params);
        return toStatusResponse(profile);
    }

    private synchronized WeightProfile recompute(AssemblyParameters params) {
        WeightProfile baseline = WeightProfile.defaults(params, calibrationEnabled, minSamples, lookbackSamples);
        if (!calibrationEnabled) {
            cachedProfile = baseline;
            return cachedProfile;
        }

        List<RouteRecommendationFeedback> samples = feedbackRepository.findLatestWithOutcome(
                PageRequest.of(0, Math.max(10, lookbackSamples))
        );
        int sampleCount = samples.size();
        if (sampleCount < Math.max(10, minSamples)) {
            cachedProfile = baseline.withSampleCount(sampleCount)
                    .withMessage("insufficient samples for calibration");
            return cachedProfile;
        }

        double[] xCons = new double[sampleCount];
        double[] xProfit = new double[sampleCount];
        double[] xRoute = new double[sampleCount];
        double[] y = new double[sampleCount];

        for (int i = 0; i < sampleCount; i++) {
            RouteRecommendationFeedback s = samples.get(i);
            xCons[i] = normalizeScore(s.getConsolidationScore());
            xProfit[i] = normalizeScore(s.getProfitScore());
            xRoute[i] = normalizeScore(s.getRouteScore());
            y[i] = outcomeTarget(s);
        }

        double corrCons = Math.max(0.0, correlation(xCons, y));
        double corrProfit = Math.max(0.0, correlation(xProfit, y));
        double corrRoute = Math.max(0.0, correlation(xRoute, y));

        double eps = 1e-6;
        double rawCons = corrCons + eps;
        double rawProfit = corrProfit + eps;
        double rawRoute = corrRoute + eps;

        double rawSum = rawCons + rawProfit + rawRoute;
        double targetCons = rawCons / rawSum;
        double targetProfit = rawProfit / rawSum;
        double targetRoute = rawRoute / rawSum;

        WeightProfile previous = cachedProfile != null ? cachedProfile : baseline;
        double smooth = clamp(smoothingFactor, 0.0, 1.0);
        double nextCons = previous.consolidationWeight() * (1.0 - smooth) + targetCons * smooth;
        double nextProfit = previous.profitWeight() * (1.0 - smooth) + targetProfit * smooth;
        double nextRoute = previous.routeWeight() * (1.0 - smooth) + targetRoute * smooth;

        double stepCap = clamp(maxStep, 0.01, 0.5);
        nextCons = capStep(previous.consolidationWeight(), nextCons, stepCap);
        nextProfit = capStep(previous.profitWeight(), nextProfit, stepCap);
        nextRoute = capStep(previous.routeWeight(), nextRoute, stepCap);

        double sum = nextCons + nextProfit + nextRoute;
        if (sum <= 0) {
            cachedProfile = baseline.withSampleCount(sampleCount)
                    .withMessage("calibration fallback to baseline (invalid sum)");
            return cachedProfile;
        }

        cachedProfile = new WeightProfile(
                true,
                true,
                sampleCount,
                minSamples,
                lookbackSamples,
                nextCons / sum,
                nextProfit / sum,
                nextRoute / sum,
                "calibrated using recent outcome feedback",
                LocalDateTime.now()
        );
        return cachedProfile;
    }

    private RouteCalibrationStatusResponse status(AssemblyParameters params, String message) {
        WeightProfile profile = cachedProfile != null
                ? cachedProfile
                : WeightProfile.defaults(params, calibrationEnabled, minSamples, lookbackSamples);
        return new RouteCalibrationStatusResponse(
                profile.enabled(),
                profile.calibrated(),
                profile.sampleCount(),
                profile.minSamples(),
                profile.lookbackSamples(),
                profile.consolidationWeight(),
                profile.profitWeight(),
                profile.routeWeight(),
                message,
                profile.updatedAt()
        );
    }

    private RouteCalibrationStatusResponse toStatusResponse(WeightProfile profile) {
        return new RouteCalibrationStatusResponse(
                profile.enabled(),
                profile.calibrated(),
                profile.sampleCount(),
                profile.minSamples(),
                profile.lookbackSamples(),
                profile.consolidationWeight(),
                profile.profitWeight(),
                profile.routeWeight(),
                profile.message(),
                profile.updatedAt()
        );
    }

    private String generateCalibrationId() {
        return UUID.randomUUID().toString().replace("-", "");
    }

    private double normalizeScore(Double score) {
        if (score == null) {
            return 0.0;
        }
        return clamp(score / 100.0, 0.0, 1.0);
    }

    private double outcomeTarget(RouteRecommendationFeedback sample) {
        double accept = sample.getAccepted() == null ? 0.5 : (sample.getAccepted() ? 1.0 : 0.0);
        double onTime = sample.getCompletedOnTime() == null ? 0.5 : (sample.getCompletedOnTime() ? 1.0 : 0.0);
        double cancelPenalty = sample.getCancelled() == null ? 0.0 : (sample.getCancelled() ? -0.25 : 0.0);
        double profit = sample.getRealizedProfit() == null ? 0.5 : sigmoid(sample.getRealizedProfit() / 200000.0);

        return clamp((accept * 0.45) + (onTime * 0.35) + (profit * 0.20) + cancelPenalty, 0.0, 1.0);
    }

    private double sigmoid(double x) {
        return 1.0 / (1.0 + Math.exp(-x));
    }

    private double correlation(double[] x, double[] y) {
        if (x.length != y.length || x.length < 2) {
            return 0.0;
        }
        double meanX = mean(x);
        double meanY = mean(y);
        double cov = 0.0;
        double varX = 0.0;
        double varY = 0.0;
        for (int i = 0; i < x.length; i++) {
            double dx = x[i] - meanX;
            double dy = y[i] - meanY;
            cov += dx * dy;
            varX += dx * dx;
            varY += dy * dy;
        }
        if (varX <= 1e-12 || varY <= 1e-12) {
            return 0.0;
        }
        return cov / Math.sqrt(varX * varY);
    }

    private double mean(double[] values) {
        if (values.length == 0) {
            return 0.0;
        }
        double sum = 0.0;
        for (double value : values) {
            sum += value;
        }
        return sum / values.length;
    }

    private double capStep(double previous, double next, double maxAbsStep) {
        double delta = next - previous;
        if (delta > maxAbsStep) {
            return previous + maxAbsStep;
        }
        if (delta < -maxAbsStep) {
            return previous - maxAbsStep;
        }
        return next;
    }

    private double clamp(double value, double min, double max) {
        return Math.max(min, Math.min(max, value));
    }

    public record WeightProfile(
            boolean enabled,
            boolean calibrated,
            int sampleCount,
            int minSamples,
            int lookbackSamples,
            double consolidationWeight,
            double profitWeight,
            double routeWeight,
            String message,
            LocalDateTime updatedAt
    ) {
        public static WeightProfile defaults(
                AssemblyParameters params,
                boolean enabled,
                int minSamples,
                int lookbackSamples
        ) {
            return new WeightProfile(
                    enabled,
                    false,
                    0,
                    minSamples,
                    lookbackSamples,
                    params.consolidationWeight(),
                    params.profitWeight(),
                    params.routeWeight(),
                    "using baseline weights",
                    LocalDateTime.now()
            );
        }

        public WeightProfile withSampleCount(int sampleCount) {
            return new WeightProfile(
                    enabled,
                    calibrated,
                    sampleCount,
                    minSamples,
                    lookbackSamples,
                    consolidationWeight,
                    profitWeight,
                    routeWeight,
                    message,
                    LocalDateTime.now()
            );
        }

        public WeightProfile withMessage(String message) {
            return new WeightProfile(
                    enabled,
                    calibrated,
                    sampleCount,
                    minSamples,
                    lookbackSamples,
                    consolidationWeight,
                    profitWeight,
                    routeWeight,
                    message,
                    LocalDateTime.now()
            );
        }
    }
}

