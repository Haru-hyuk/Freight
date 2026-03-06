package com.freight.backend.controller;

import com.freight.backend.exception.CustomException;
import com.freight.backend.exception.ErrorCode;
import com.freight.backend.service.AdminIntegrationService;
import com.freight.backend.service.AdminSanctionService;
import com.freight.backend.service.AdminTransportService;
import com.freight.backend.util.SecurityUtils;
import java.time.LocalDateTime;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import jakarta.validation.constraints.NotBlank;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/admin")
public class AdminWebCompatController {

    private static final String DERIVED_CANCEL_REASON = "상태 기반으로 생성된 취소 요청입니다.";

    private final AdminIntegrationService adminIntegrationService;
    private final AdminSanctionService adminSanctionService;
    private final AdminTransportService adminTransportService;

    @GetMapping("/ops/deviations")
    public ResponseEntity<List<Map<String, Object>>> listDeviations(
            @AuthenticationPrincipal UserDetails userDetails
    ) {
        requireAdmin(userDetails);
        return ResponseEntity.ok(adminIntegrationService.listActivityLogs());
    }

    @GetMapping("/ops/activity-logs")
    public ResponseEntity<List<Map<String, Object>>> listActivityLogsCompat(
            @AuthenticationPrincipal UserDetails userDetails
    ) {
        requireAdmin(userDetails);
        return ResponseEntity.ok(adminIntegrationService.listActivityLogs());
    }

    @PostMapping("/ops/deviations/{caseId}/actions")
    public ResponseEntity<Map<String, Object>> handleDeviationAction(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable @NotBlank String caseId,
            @RequestBody(required = false) Map<String, Object> request
    ) {
        requireAdmin(userDetails);

        Map<String, Object> body = new LinkedHashMap<>();
        body.put("success", true);
        body.put("caseId", caseId);
        body.put("action", safeText(request == null ? null : request.get("action")));
        body.put("updatedAt", LocalDateTime.now().toString());
        return ResponseEntity.ok(body);
    }

    @GetMapping("/ops/sanctions/logs")
    public ResponseEntity<Map<String, Object>> listSanctionLogs(
            @AuthenticationPrincipal UserDetails userDetails
    ) {
        requireAdmin(userDetails);

        List<Map<String, Object>> items = adminSanctionService.listSanctions();
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("items", items);
        body.put("total", items.size());
        return ResponseEntity.ok(body);
    }

    @GetMapping("/orders/cancellations")
    public ResponseEntity<Map<String, Object>> listOrderCancellationRequests(
            @AuthenticationPrincipal UserDetails userDetails
    ) {
        requireAdmin(userDetails);

        List<Map<String, Object>> rows = buildCancellationRows();
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("items", rows);
        body.put("total", rows.size());
        return ResponseEntity.ok(body);
    }

    @PostMapping("/orders/cancellations/{requestId}/review")
    public ResponseEntity<Map<String, Object>> reviewOrderCancellationRequest(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable @NotBlank String requestId,
            @RequestBody(required = false) Map<String, Object> request
    ) {
        requireAdmin(userDetails);

        String action = safeText(request == null ? null : request.get("action")).toUpperCase(Locale.ROOT);
        String status = "APPROVE".equals(action) ? "APPROVED" : "REJECTED";

        Map<String, Object> body = new LinkedHashMap<>();
        body.put("requestId", requestId);
        body.put("status", status);
        body.put("reviewMemo", safeText(request == null ? null : request.get("reviewMemo")));
        body.put("reviewedBy", userDetails == null ? "admin" : userDetails.getUsername());
        body.put("reviewedAt", LocalDateTime.now().toString());
        return ResponseEntity.ok(body);
    }

    private List<Map<String, Object>> buildCancellationRows() {
        List<Map<String, Object>> quotes = adminTransportService.listQuotes();
        List<Map<String, Object>> matches = adminTransportService.listMatches();

        Map<Long, Map<String, Object>> latestMatchByQuoteId = new LinkedHashMap<>();
        for (Map<String, Object> match : matches) {
            Long quoteId = toLong(match.get("quote_id"));
            if (quoteId == null || quoteId <= 0) continue;
            Map<String, Object> current = latestMatchByQuoteId.get(quoteId);
            if (current == null || compareMatchUpdatedAt(match, current) >= 0) {
                latestMatchByQuoteId.put(quoteId, match);
            }
        }

        List<Map<String, Object>> rows = new ArrayList<>();
        for (Map<String, Object> quote : quotes) {
            Long quoteId = toLong(quote.get("quote_id"));
            if (quoteId == null || quoteId <= 0) continue;

            Map<String, Object> match = latestMatchByQuoteId.get(quoteId);
            Long matchId = toLong(match == null ? null : match.get("match_id"));
            Long driverId = toLong(match == null ? null : match.get("driver_id"));
            String quoteStatus = safeText(quote.get("status")).toUpperCase(Locale.ROOT);
            String matchStatus = safeText(match == null ? null : match.get("status")).toUpperCase(Locale.ROOT);

            boolean quoteCancelled = "CANCELLED".equals(quoteStatus) || "CANCELED".equals(quoteStatus);
            boolean matchCancelled = "CANCELLED".equals(matchStatus) || "CANCELED".equals(matchStatus);
            if (!quoteCancelled && !matchCancelled) continue;

            String requestedByRole;
            if (quoteCancelled && !matchCancelled) {
                requestedByRole = "SHIPPER";
            } else if (matchCancelled && !quoteCancelled) {
                requestedByRole = "DRIVER";
            } else {
                requestedByRole = "UNKNOWN";
            }

            String requestedAt = safeText(
                    quote.get("updated_at"),
                    safeText(quote.get("created_at"), LocalDateTime.now().toString())
            );
            String approvalStatus = quoteCancelled && !matchCancelled ? "PENDING" : "APPROVED";
            String shipperName = safeText(quote.get("shipper_name"), "화주");
            String driverName = driverId == null || driverId <= 0 ? "기사" : "기사 D-" + driverId;

            Map<String, Object> row = new LinkedHashMap<>();
            row.put("requestId", "CR-DERIVED-" + quoteId + "-" + (matchId == null ? 0 : matchId));
            row.put("quoteId", quoteId);
            row.put("matchId", matchId);
            row.put("requestedByRole", requestedByRole);
            row.put("requestedByName", "SHIPPER".equals(requestedByRole) ? shipperName : driverName);
            row.put("shipperId", quote.get("shipper_id"));
            row.put("shipperName", shipperName);
            row.put("driverId", driverId);
            row.put("driverName", driverName);
            row.put("originAddress", quote.get("origin_address"));
            row.put("destinationAddress", quote.get("destination_address"));
            row.put("cargoName", safeText(quote.get("cargo_name"), "화물"));
            row.put("cancelReason", DERIVED_CANCEL_REASON);
            row.put("requestedAt", requestedAt);
            row.put("approvalStatus", approvalStatus);
            row.put("source", "DERIVED");
            rows.add(row);
        }

        rows.sort(Comparator.comparing(
                (Map<String, Object> row) -> toDateTime(row.get("requestedAt")),
                Comparator.nullsLast(Comparator.reverseOrder())
        ));
        return rows;
    }

    private int compareMatchUpdatedAt(Map<String, Object> left, Map<String, Object> right) {
        LocalDateTime leftTime = toDateTime(safeText(left.get("updated_at"), safeText(left.get("created_at"))));
        LocalDateTime rightTime = toDateTime(safeText(right.get("updated_at"), safeText(right.get("created_at"))));
        if (leftTime == null && rightTime == null) return 0;
        if (leftTime == null) return -1;
        if (rightTime == null) return 1;
        return leftTime.compareTo(rightTime);
    }

    private static String safeText(Object value) {
        if (value == null) return "";
        if (value instanceof String text) return text.trim();
        return String.valueOf(value).trim();
    }

    private static String safeText(Object value, String fallback) {
        String text = safeText(value);
        return text.isEmpty() ? fallback : text;
    }

    private static Long toLong(Object value) {
        if (value == null) return null;
        if (value instanceof Number number) return number.longValue();
        String text = safeText(value);
        if (text.isEmpty()) return null;
        try {
            return Long.parseLong(text);
        } catch (NumberFormatException ex) {
            return null;
        }
    }

    private static LocalDateTime toDateTime(Object value) {
        String text = safeText(value);
        if (text.isEmpty()) return null;
        try {
            return LocalDateTime.parse(text);
        } catch (DateTimeParseException ex) {
            return null;
        }
    }

    private static void requireAdmin(UserDetails userDetails) {
        if (userDetails == null || !SecurityUtils.isAdmin(userDetails)) {
            throw new CustomException(ErrorCode.AUTH_FORBIDDEN);
        }
    }
}
