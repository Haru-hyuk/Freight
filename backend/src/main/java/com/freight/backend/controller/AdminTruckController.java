package com.freight.backend.controller;

import com.freight.backend.dto.truck.TruckApprovalUpdateRequest;
import com.freight.backend.dto.truck.TruckResponse;
import com.freight.backend.service.TruckService;
import jakarta.validation.Valid;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/admin/trucks")
@RequiredArgsConstructor
public class AdminTruckController {

    private final TruckService truckService;

    @GetMapping("/pending")
    public ResponseEntity<List<TruckResponse>> listPending() {
        return ResponseEntity.ok(truckService.listPendingTrucksForAdmin());
    }

    @PatchMapping("/{truckId}/approval")
    public ResponseEntity<TruckResponse> updateApproval(
            @PathVariable Long truckId,
            @Valid @RequestBody TruckApprovalUpdateRequest request
    ) {
        return ResponseEntity.ok(truckService.updateApprovalForAdmin(truckId, request.getApproved()));
    }
}

