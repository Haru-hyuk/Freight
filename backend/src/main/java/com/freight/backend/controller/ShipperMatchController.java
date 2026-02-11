package com.freight.backend.controller;

import com.freight.backend.dto.match.MatchCreateRequest;
import com.freight.backend.dto.match.MatchResponse;
import com.freight.backend.exception.CustomException;
import com.freight.backend.exception.ErrorCode;
import com.freight.backend.service.MatchService;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * 화주용 매칭 API
 * Base path: /api/shipper/matches
 * 인증: JWT (Bearer), ROLE_SHIPPER
 */
@RestController
@RequestMapping("/api/shipper/matches")
@RequiredArgsConstructor
public class ShipperMatchController {

    private final MatchService matchService;

    private static Long requireShipperId(UserDetails userDetails) {
        if (userDetails == null || !userDetails.getAuthorities().contains(new SimpleGrantedAuthority("ROLE_SHIPPER"))) {
            throw new CustomException(ErrorCode.AUTH_FORBIDDEN);
        }
        return Long.parseLong(userDetails.getUsername());
    }

    /**
     * 매칭 생성 (화주)
     * POST /api/shipper/matches
     */
    @PostMapping
    public ResponseEntity<MatchResponse> createMatch(
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestBody MatchCreateRequest request
    ) {
        Long shipperId = requireShipperId(userDetails);
        MatchResponse response = matchService.createMatch(shipperId, request.getQuoteId());
        return ResponseEntity.ok(response);
    }

    /**
     * 화주가 생성한 매칭 목록 (내 매칭, 취소 제외)
     * GET /api/shipper/matches/me
     */
    @GetMapping("/me")
    public ResponseEntity<List<MatchResponse>> getMyMatches(
            @AuthenticationPrincipal UserDetails userDetails
    ) {
        Long shipperId = requireShipperId(userDetails);
        List<MatchResponse> matches = matchService.getShipperMatches(shipperId);
        return ResponseEntity.ok(matches);
    }

    /**
     * 매칭 취소 (화주: 본인 견적의 매칭만)
     * DELETE /api/shipper/matches/{matchId}
     */
    @DeleteMapping("/{matchId}")
    public ResponseEntity<Void> cancelMatch(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable Long matchId
    ) {
        Long userId = requireShipperId(userDetails);
        matchService.cancelMatch(userId, "ROLE_SHIPPER", matchId);
        return ResponseEntity.noContent().build();
    }

    /**
     * 매칭 상세 조회 (화주: 본인 견적의 매칭만)
     * GET /api/shipper/matches/{matchId}
     */
    @GetMapping("/{matchId}")
    public ResponseEntity<MatchResponse> getMatch(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable Long matchId
    ) {
        Long userId = requireShipperId(userDetails);
        MatchResponse response = matchService.getMatch(matchId, userId, "ROLE_SHIPPER");
        return ResponseEntity.ok(response);
    }
}
