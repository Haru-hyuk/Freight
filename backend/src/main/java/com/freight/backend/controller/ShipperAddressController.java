package com.freight.backend.controller;

import com.freight.backend.dto.shipper.ShipperAddressItemResponse;
import com.freight.backend.dto.shipper.ShipperAddressUpsertRequest;
import com.freight.backend.exception.CustomException;
import com.freight.backend.exception.ErrorCode;
import com.freight.backend.service.ShipperAddressService;
import com.freight.backend.util.SecurityUtils;
import jakarta.validation.Valid;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/shipper/addresses")
@RequiredArgsConstructor
public class ShipperAddressController {

    private final ShipperAddressService shipperAddressService;

    @GetMapping
    public ResponseEntity<List<ShipperAddressItemResponse>> list(
            @AuthenticationPrincipal UserDetails userDetails
    ) {
        Long shipperId = SecurityUtils.requireShipperId(userDetails);
        return ResponseEntity.ok(shipperAddressService.listByShipper(shipperId));
    }

    @PostMapping
    public ResponseEntity<ShipperAddressItemResponse> create(
            @AuthenticationPrincipal UserDetails userDetails,
            @Valid @RequestBody ShipperAddressUpsertRequest req
    ) {
        Long shipperId = SecurityUtils.requireShipperId(userDetails);
        return ResponseEntity.ok(shipperAddressService.create(shipperId, req));
    }

    @PutMapping("/{addressId}")
    public ResponseEntity<ShipperAddressItemResponse> update(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable String addressId,
            @Valid @RequestBody ShipperAddressUpsertRequest req
    ) {
        Long shipperId = SecurityUtils.requireShipperId(userDetails);
        return ResponseEntity.ok(shipperAddressService.update(shipperId, parseAddressId(addressId), req));
    }

    @DeleteMapping("/{addressId}")
    public ResponseEntity<Void> delete(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable String addressId
    ) {
        Long shipperId = SecurityUtils.requireShipperId(userDetails);
        shipperAddressService.delete(shipperId, parseAddressId(addressId));
        return ResponseEntity.noContent().build();
    }

    private Long parseAddressId(String raw) {
        try {
            return Long.parseLong(raw);
        } catch (NumberFormatException e) {
            throw new CustomException(ErrorCode.INVALID_REQUEST);
        }
    }
}
