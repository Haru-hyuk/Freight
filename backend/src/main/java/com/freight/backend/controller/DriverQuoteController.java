package com.freight.backend.controller;

import com.freight.backend.dto.quote.DriverQuoteSummaryResponse;
import com.freight.backend.exception.CustomException;
import com.freight.backend.exception.ErrorCode;
import com.freight.backend.service.QuoteService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/driver/quotes")
public class DriverQuoteController {

    private final QuoteService quoteService;

    @GetMapping("/{quoteId}/summary")
    public ResponseEntity<DriverQuoteSummaryResponse> getQuoteSummary(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable Long quoteId
    ) {
        requireDriver(userDetails);
        return ResponseEntity.ok(quoteService.getDriverQuoteSummary(quoteId));
    }

    private static void requireDriver(UserDetails userDetails) {
        if (userDetails == null || !userDetails.getAuthorities().contains(new SimpleGrantedAuthority("ROLE_DRIVER"))) {
            throw new CustomException(ErrorCode.AUTH_FORBIDDEN);
        }
    }
}
