package com.freight.backend.controller;

import com.freight.backend.exception.CustomException;
import com.freight.backend.exception.ErrorCode;
import com.freight.backend.service.AdminTransportService;
import java.util.List;
import java.util.Map;
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
@RequestMapping("/api/admin")
public class AdminTransportController {

    private final AdminTransportService adminTransportService;

    @GetMapping("/quotes")
    public ResponseEntity<List<Map<String, Object>>> quotes(@AuthenticationPrincipal UserDetails userDetails) {
        requireAdmin(userDetails);
        return ResponseEntity.ok(adminTransportService.listQuotes());
    }

    @GetMapping("/quotes/{quoteId}")
    public ResponseEntity<Map<String, Object>> quote(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable Long quoteId
    ) {
        requireAdmin(userDetails);
        return ResponseEntity.ok(adminTransportService.getQuote(quoteId));
    }

    @GetMapping("/matches")
    public ResponseEntity<List<Map<String, Object>>> matches(@AuthenticationPrincipal UserDetails userDetails) {
        requireAdmin(userDetails);
        return ResponseEntity.ok(adminTransportService.listMatches());
    }

    @GetMapping("/matches/{matchId}")
    public ResponseEntity<Map<String, Object>> match(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable Long matchId
    ) {
        requireAdmin(userDetails);
        return ResponseEntity.ok(adminTransportService.getMatch(matchId));
    }

    @GetMapping("/payments")
    public ResponseEntity<List<Map<String, Object>>> payments(@AuthenticationPrincipal UserDetails userDetails) {
        requireAdmin(userDetails);
        return ResponseEntity.ok(adminTransportService.listPayments());
    }

    @GetMapping("/settlements")
    public ResponseEntity<List<Map<String, Object>>> settlements(@AuthenticationPrincipal UserDetails userDetails) {
        requireAdmin(userDetails);
        return ResponseEntity.ok(adminTransportService.listSettlements());
    }

    private static void requireAdmin(UserDetails userDetails) {
        if (userDetails == null || !userDetails.getAuthorities().contains(new SimpleGrantedAuthority("ROLE_ADMIN"))) {
            throw new CustomException(ErrorCode.AUTH_FORBIDDEN);
        }
    }
}
