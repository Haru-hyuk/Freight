package com.freight.backend.controller;

import com.freight.backend.dto.counter.CounterOfferCreateRequest;
import com.freight.backend.dto.counter.CounterOfferResponse;
import com.freight.backend.exception.CustomException;
import com.freight.backend.exception.ErrorCode;
import com.freight.backend.service.CounterOfferService;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/driver")
@RequiredArgsConstructor
public class DriverCounterOfferController {

    private final CounterOfferService counterOfferService;

    private static Long requireDriverId(UserDetails userDetails) {
        if (userDetails == null || !userDetails.getAuthorities().contains(new SimpleGrantedAuthority("ROLE_DRIVER"))) {
            throw new CustomException(ErrorCode.AUTH_FORBIDDEN);
        }
        return Long.parseLong(userDetails.getUsername());
    }

    @PostMapping("/quotes/{quoteId}/counter-offers")
    public ResponseEntity<CounterOfferResponse> createCounterOffer(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable Long quoteId,
            @RequestBody CounterOfferCreateRequest request
    ) {
        Long driverId = requireDriverId(userDetails);
        CounterOfferResponse response = counterOfferService.createOffer(driverId, quoteId, request);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/counter-offers/me")
    public ResponseEntity<List<CounterOfferResponse>> getMyCounterOffers(
            @AuthenticationPrincipal UserDetails userDetails
    ) {
        Long driverId = requireDriverId(userDetails);
        return ResponseEntity.ok(counterOfferService.getMyOffers(driverId));
    }
}
