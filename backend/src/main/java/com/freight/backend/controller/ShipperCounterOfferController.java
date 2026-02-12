package com.freight.backend.controller;

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
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/shipper")
@RequiredArgsConstructor
public class ShipperCounterOfferController {

    private final CounterOfferService counterOfferService;

    private static Long requireShipperId(UserDetails userDetails) {
        if (userDetails == null || !userDetails.getAuthorities().contains(new SimpleGrantedAuthority("ROLE_SHIPPER"))) {
            throw new CustomException(ErrorCode.AUTH_FORBIDDEN);
        }
        return Long.parseLong(userDetails.getUsername());
    }

    @GetMapping("/quotes/{quoteId}/counter-offers")
    public ResponseEntity<List<CounterOfferResponse>> getCounterOffers(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable Long quoteId
    ) {
        Long shipperId = requireShipperId(userDetails);
        return ResponseEntity.ok(counterOfferService.getOffersForQuote(shipperId, quoteId));
    }

    @PatchMapping("/counter-offers/{offerId}/accept")
    public ResponseEntity<Void> acceptCounterOffer(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable Long offerId
    ) {
        Long shipperId = requireShipperId(userDetails);
        counterOfferService.acceptOffer(shipperId, offerId);
        return ResponseEntity.noContent().build();
    }

    @PatchMapping("/counter-offers/{offerId}/reject")
    public ResponseEntity<Void> rejectCounterOffer(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable Long offerId
    ) {
        Long shipperId = requireShipperId(userDetails);
        counterOfferService.rejectOffer(shipperId, offerId);
        return ResponseEntity.noContent().build();
    }
}
