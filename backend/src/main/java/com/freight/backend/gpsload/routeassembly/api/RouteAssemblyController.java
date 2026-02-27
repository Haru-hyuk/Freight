package com.freight.backend.gpsload.routeassembly.api;

import com.freight.backend.gpsload.routeassembly.model.Quote;
import com.freight.backend.gpsload.routeassembly.model.AssemblyParameters;
import com.freight.backend.gpsload.routeassembly.model.RouteAcceptRequest;
import com.freight.backend.gpsload.routeassembly.model.RouteAcceptResponse;
import com.freight.backend.gpsload.routeassembly.model.RouteAssemblyRequest;
import com.freight.backend.gpsload.routeassembly.model.RouteAssemblyResponse;
import com.freight.backend.gpsload.routeassembly.model.RouteCalibrationFeedbackRequest;
import com.freight.backend.gpsload.routeassembly.model.RouteCalibrationFeedbackResponse;
import com.freight.backend.gpsload.routeassembly.model.RouteCalibrationStatusResponse;
import com.freight.backend.gpsload.routeassembly.service.QuoteAcceptanceService;
import com.freight.backend.gpsload.routeassembly.service.QuoteCandidateService;
import com.freight.backend.gpsload.routeassembly.service.RouteAssemblyService;
import com.freight.backend.gpsload.routeassembly.service.RouteScoringCalibrationService;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.HashSet;
import java.util.List;
import java.util.Set;

/**
 * Route assembly API controller.
 */
@RestController
@RequestMapping("/api/route-assembly")
public class RouteAssemblyController {

    private final RouteAssemblyService routeAssemblyService;
    private final QuoteAcceptanceService quoteAcceptanceService;
    private final QuoteCandidateService quoteCandidateService;
    private final RouteScoringCalibrationService routeScoringCalibrationService;

    public RouteAssemblyController(
            RouteAssemblyService routeAssemblyService,
            QuoteAcceptanceService quoteAcceptanceService,
            QuoteCandidateService quoteCandidateService,
            RouteScoringCalibrationService routeScoringCalibrationService
    ) {
        this.routeAssemblyService = routeAssemblyService;
        this.quoteAcceptanceService = quoteAcceptanceService;
        this.quoteCandidateService = quoteCandidateService;
        this.routeScoringCalibrationService = routeScoringCalibrationService;
    }

    @PostMapping(
            value = "/recommend",
            consumes = MediaType.APPLICATION_JSON_VALUE,
            produces = MediaType.APPLICATION_JSON_VALUE
    )
    public RouteAssemblyResponse recommend(@RequestBody RouteAssemblyRequest request) {
        List<Quote> openCandidates = quoteCandidateService.findOpenCandidates(request.driverState(), 200);
        if (request.hasSelectedQuotes()) {
            Set<Long> selectedIds = new HashSet<>(request.selectedQuoteIds());
            openCandidates = openCandidates.stream()
                    .filter(q -> q.quoteId() != null && selectedIds.contains(q.quoteId()))
                    .toList();
        }

        RouteAssemblyRequest effectiveRequest = new RouteAssemblyRequest(
                request.driverState(),
                openCandidates,
                request.parameters(),
                request.selectedQuoteIds(),
                request.mode()
        );

        return routeAssemblyService.recommend(effectiveRequest);
    }

    @PostMapping(
            value = "/evaluate",
            consumes = MediaType.APPLICATION_JSON_VALUE,
            produces = MediaType.APPLICATION_JSON_VALUE
    )
    public RouteAssemblyResponse evaluate(@RequestBody RouteAssemblyRequest request) {
        if (!request.hasCandidateQuotes()) {
            return RouteAssemblyResponse.failure("평가할 견적이 없습니다.");
        }

        List<Quote> quotesToEvaluate = request.candidateQuotes();
        if (request.hasSelectedQuotes()) {
            Set<Long> selectedIds = new HashSet<>(request.selectedQuoteIds());
            quotesToEvaluate = request.candidateQuotes().stream()
                    .filter(q -> q.quoteId() != null && selectedIds.contains(q.quoteId()))
                    .toList();

            if (quotesToEvaluate.isEmpty()) {
                return RouteAssemblyResponse.failure("선택한 견적 ID와 일치하는 데이터가 없습니다.");
            }
        }

        boolean hasNonOpen = quotesToEvaluate.stream()
                .anyMatch(q -> q == null || q.status() == null || !"OPEN".equalsIgnoreCase(q.status().trim()));
        if (hasNonOpen) {
            return RouteAssemblyResponse.failure("OPEN 상태가 아닌 견적은 평가할 수 없습니다.");
        }

        return routeAssemblyService.evaluateSelectedQuotes(
                request.driverState(),
                quotesToEvaluate,
                request.getEffectiveParameters()
        );
    }

    @PostMapping(
            value = "/accept",
            consumes = MediaType.APPLICATION_JSON_VALUE,
            produces = MediaType.APPLICATION_JSON_VALUE
    )
    public RouteAcceptResponse accept(@RequestBody RouteAcceptRequest request) {
        return quoteAcceptanceService.accept(request);
    }

    @PostMapping(
            value = "/calibration/feedback",
            consumes = MediaType.APPLICATION_JSON_VALUE,
            produces = MediaType.APPLICATION_JSON_VALUE
    )
    public RouteCalibrationFeedbackResponse feedback(@RequestBody RouteCalibrationFeedbackRequest request) {
        if (request == null || !request.isValid()) {
            return RouteCalibrationFeedbackResponse.fail(
                    request == null ? null : request.calibrationId(),
                    "invalid calibration feedback request"
            );
        }
        RouteCalibrationStatusResponse status = routeScoringCalibrationService.applyFeedback(request);
        return RouteCalibrationFeedbackResponse.ok(
                request.calibrationId(),
                "feedback applied, calibrated=" + status.calibrated() + ", samples=" + status.sampleCount()
        );
    }

    @PostMapping(
            value = "/calibration/recompute",
            produces = MediaType.APPLICATION_JSON_VALUE
    )
    public RouteCalibrationStatusResponse recomputeCalibration() {
        return routeScoringCalibrationService.recomputeNow(AssemblyParameters.defaults());
    }

    @GetMapping(value = "/calibration/status", produces = MediaType.APPLICATION_JSON_VALUE)
    public RouteCalibrationStatusResponse calibrationStatus() {
        return routeScoringCalibrationService.status(AssemblyParameters.defaults());
    }

    @GetMapping("/health")
    public String health() {
        return "Route Assembly Service is running";
    }
}
