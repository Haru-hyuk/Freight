package com.freight.backend.controller;

import com.freight.backend.dto.admin.AdminDispatchForceAssignRequest;
import com.freight.backend.dto.admin.AdminPricingAdditionalUpdateRequest;
import com.freight.backend.dto.admin.AdminTruckSpecUpdateRequest;
import com.freight.backend.dto.admin.AdminPricingVehicleUpdateRequest;
import com.freight.backend.dto.admin.AdminQuoteUpdateRequest;
import com.freight.backend.dto.admin.AdminReviewRequest;
import com.freight.backend.dto.admin.DeliveryHistoryRowResponse;
import com.freight.backend.dto.admin.LiveDeliveryDetailResponse;
import com.freight.backend.dto.admin.LiveDeliveryRowResponse;
import com.freight.backend.dto.admin.PaginatedResponse;
import com.freight.backend.exception.CustomException;
import com.freight.backend.exception.ErrorCode;
import com.freight.backend.service.AdminIntegrationService;
import jakarta.validation.Valid;
import com.freight.backend.util.SecurityUtils;
import java.util.List;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/admin")
public class AdminIntegrationController {

    private final AdminIntegrationService adminIntegrationService;

    @GetMapping("/delivery/history")
    public ResponseEntity<PaginatedResponse<DeliveryHistoryRowResponse>> deliveryHistory(
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestParam(required = false) String q,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) Integer page,
            @RequestParam(required = false) Integer size
    ) {
        requireAdmin(userDetails);
        return ResponseEntity.ok(adminIntegrationService.listDeliveryHistoryTyped(q, status, page, size));
    }

    @GetMapping("/delivery/live")
    public ResponseEntity<List<LiveDeliveryRowResponse>> liveDeliveries(
            @AuthenticationPrincipal UserDetails userDetails
    ) {
        requireAdmin(userDetails);
        return ResponseEntity.ok(adminIntegrationService.listLiveDeliveriesTyped());
    }

    @GetMapping("/delivery/live/{matchId}")
    public ResponseEntity<LiveDeliveryDetailResponse> liveDeliveryDetail(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable String matchId
    ) {
        requireAdmin(userDetails);
        return ResponseEntity.ok(adminIntegrationService.getLiveDeliveryDetailTyped(matchId));
    }

    @PostMapping("/notifications/kakao/live-alert")
    public ResponseEntity<Void> notifyLiveAlert(
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestBody(required = false) Map<String, Object> payload
    ) {
        requireAdmin(userDetails);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/dispatch")
    public ResponseEntity<Map<String, Object>> dispatchRows(
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestParam(required = false) String q,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String dispatchState,
            @RequestParam(required = false) String paymentStatus,
            @RequestParam(required = false) String settlementStatus,
            @RequestParam(required = false) Integer page,
            @RequestParam(required = false) Integer size
    ) {
        requireAdmin(userDetails);
        return ResponseEntity.ok(adminIntegrationService.listDispatchRows(
                q, status, dispatchState, paymentStatus, settlementStatus, page, size
        ));
    }

    @GetMapping("/dispatch/{matchId}/drivers")
    public ResponseEntity<List<Map<String, Object>>> assignableDrivers(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable String matchId
    ) {
        requireAdmin(userDetails);
        return ResponseEntity.ok(adminIntegrationService.listAssignableDrivers(matchId));
    }

    @PostMapping("/dispatch/{matchId}/force-assign")
    public ResponseEntity<Map<String, Object>> forceAssign(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable String matchId,
            @Valid @RequestBody(required = false) AdminDispatchForceAssignRequest request
    ) {
        requireAdmin(userDetails);
        String driverId = request == null ? null : request.getDriverId();
        return ResponseEntity.ok(adminIntegrationService.forceAssign(matchId, driverId));
    }

    @GetMapping("/drivers/approvals")
    public ResponseEntity<List<Map<String, Object>>> driverApprovals(
            @AuthenticationPrincipal UserDetails userDetails
    ) {
        requireAdmin(userDetails);
        return ResponseEntity.ok(adminIntegrationService.listDriverApprovals());
    }

    @PostMapping("/drivers/approvals/{driverId}/review")
    public ResponseEntity<Void> reviewDriverApproval(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable String driverId,
            @Valid @RequestBody(required = false) AdminReviewRequest request
    ) {
        requireAdmin(userDetails);
        adminIntegrationService.reviewDriverApproval(
                driverId,
                request == null ? null : request.getAction(),
                request == null ? null : request.getReason()
        );
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/trucks/approvals")
    public ResponseEntity<List<Map<String, Object>>> truckApprovals(
            @AuthenticationPrincipal UserDetails userDetails
    ) {
        requireAdmin(userDetails);
        return ResponseEntity.ok(adminIntegrationService.listTruckApprovals());
    }

    @PostMapping("/trucks/approvals/{truckId}/review")
    public ResponseEntity<Void> reviewTruckApproval(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable String truckId,
            @Valid @RequestBody(required = false) AdminReviewRequest request
    ) {
        requireAdmin(userDetails);
        adminIntegrationService.reviewTruckApproval(
                truckId,
                request == null ? null : request.getAction(),
                request == null ? null : request.getReason()
        );
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/settlements/approvals")
    public ResponseEntity<List<Map<String, Object>>> settlementApprovals(
            @AuthenticationPrincipal UserDetails userDetails
    ) {
        requireAdmin(userDetails);
        return ResponseEntity.ok(adminIntegrationService.listSettlementApprovals());
    }

    @GetMapping("/settlements/approval-history")
    public ResponseEntity<List<Map<String, Object>>> settlementApprovalHistory(
            @AuthenticationPrincipal UserDetails userDetails
    ) {
        requireAdmin(userDetails);
        return ResponseEntity.ok(adminIntegrationService.listSettlementApprovalHistory());
    }

    @PostMapping("/settlements/{settlementId}/review")
    public ResponseEntity<Void> reviewSettlement(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable String settlementId,
            @Valid @RequestBody(required = false) AdminReviewRequest request
    ) {
        requireAdmin(userDetails);
        adminIntegrationService.reviewSettlement(
                settlementId,
                request == null ? null : request.getAction(),
                request == null ? null : request.getReason()
        );
        return ResponseEntity.noContent().build();
    }

    @PatchMapping("/quotes/{quoteId}")
    public ResponseEntity<Map<String, Object>> updateQuote(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable String quoteId,
            @Valid @RequestBody(required = false) AdminQuoteUpdateRequest request
    ) {
        requireAdmin(userDetails);
        return ResponseEntity.ok(adminIntegrationService.updateQuote(quoteId, request));
    }

    @PostMapping("/notifications/quote-updated")
    public ResponseEntity<Void> quoteUpdatedNotification(
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestBody(required = false) Map<String, Object> payload
    ) {
        requireAdmin(userDetails);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/pricing/vehicles")
    public ResponseEntity<List<Map<String, Object>>> vehiclePricingRows(
            @AuthenticationPrincipal UserDetails userDetails
    ) {
        requireAdmin(userDetails);
        return ResponseEntity.ok(adminIntegrationService.listVehiclePricingRows());
    }

    @PatchMapping("/pricing/vehicles/{vehiclePricingId}")
    public ResponseEntity<Map<String, Object>> updateVehiclePricing(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable String vehiclePricingId,
            @Valid @RequestBody(required = false) AdminPricingVehicleUpdateRequest request
    ) {
        requireAdmin(userDetails);
        return ResponseEntity.ok(adminIntegrationService.updateVehiclePricing(vehiclePricingId, request));
    }

    @GetMapping("/pricing/additional-options")
    public ResponseEntity<List<Map<String, Object>>> additionalPricingRows(
            @AuthenticationPrincipal UserDetails userDetails
    ) {
        requireAdmin(userDetails);
        return ResponseEntity.ok(adminIntegrationService.listAdditionalPricingRows());
    }

    @PatchMapping("/pricing/additional-options/{additionalPricingId}")
    public ResponseEntity<Map<String, Object>> updateAdditionalPricing(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable String additionalPricingId,
            @Valid @RequestBody(required = false) AdminPricingAdditionalUpdateRequest request
    ) {
        requireAdmin(userDetails);
        return ResponseEntity.ok(adminIntegrationService.updateAdditionalPricing(additionalPricingId, request));
    }

    @GetMapping("/reference/truck-specs")
    public ResponseEntity<List<Map<String, Object>>> truckSpecRows(
            @AuthenticationPrincipal UserDetails userDetails
    ) {
        requireAdmin(userDetails);
        return ResponseEntity.ok(adminIntegrationService.listTruckSpecRows());
    }

    @PatchMapping("/reference/truck-specs/{specId}")
    public ResponseEntity<Map<String, Object>> updateTruckSpec(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable String specId,
            @Valid @RequestBody(required = false) AdminTruckSpecUpdateRequest request
    ) {
        requireAdmin(userDetails);
        return ResponseEntity.ok(adminIntegrationService.updateTruckSpec(specId, request));
    }

    @PostMapping("/notifications/pricing-updated")
    public ResponseEntity<Void> pricingUpdatedNotification(
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestBody(required = false) Map<String, Object> payload
    ) {
        requireAdmin(userDetails);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/activity-logs")
    public ResponseEntity<List<Map<String, Object>>> activityLogs(
            @AuthenticationPrincipal UserDetails userDetails
    ) {
        requireAdmin(userDetails);
        return ResponseEntity.ok(adminIntegrationService.listActivityLogs());
    }

    private static void requireAdmin(UserDetails userDetails) {
        if (userDetails == null || !SecurityUtils.isAdmin(userDetails)) {
            throw new CustomException(ErrorCode.AUTH_FORBIDDEN);
        }
    }
}
