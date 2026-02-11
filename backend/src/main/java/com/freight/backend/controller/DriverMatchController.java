package com.freight.backend.controller;

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
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * 기사용 매칭 API
 * Base path: /api/driver/matches
 * 인증: JWT (Bearer), ROLE_DRIVER
 */
@RestController
@RequestMapping("/api/driver/matches")
@RequiredArgsConstructor
public class DriverMatchController {

    private final MatchService matchService;

    private static Long requireDriverId(UserDetails userDetails) {
        if (userDetails == null || !userDetails.getAuthorities().contains(new SimpleGrantedAuthority("ROLE_DRIVER"))) {
            throw new CustomException(ErrorCode.AUTH_FORBIDDEN);
        }
        return Long.parseLong(userDetails.getUsername());
    }

    /**
     * 수락 가능 매칭 목록 (아직 아무도 수락하지 않은 매칭)
     * GET /api/driver/matches
     */
    @GetMapping
    public ResponseEntity<List<MatchResponse>> getOpenMatches(
            @AuthenticationPrincipal UserDetails userDetails
    ) {
        requireDriverId(userDetails);
        List<MatchResponse> matches = matchService.getOpenMatches();
        return ResponseEntity.ok(matches);
    }

    /**
     * 기사가 수락한 매칭 목록 (내 매칭)
     * GET /api/driver/matches/me
     */
    @GetMapping("/me")
    public ResponseEntity<List<MatchResponse>> getMyMatches(
            @AuthenticationPrincipal UserDetails userDetails
    ) {
        Long driverId = requireDriverId(userDetails);
        List<MatchResponse> matches = matchService.getDriverMatches(driverId);
        return ResponseEntity.ok(matches);
    }

    /**
     * 매칭 수락 (기사)
     * POST /api/driver/matches/{matchId}/accept
     */
    @PostMapping("/{matchId}/accept")
    public ResponseEntity<MatchResponse> acceptMatch(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable Long matchId
    ) {
        Long driverId = requireDriverId(userDetails);
        MatchResponse response = matchService.acceptMatch(driverId, matchId);
        return ResponseEntity.ok(response);
    }

    /**
     * 매칭 취소 (기사: 본인이 수락한 매칭만)
     * DELETE /api/driver/matches/{matchId}
     */
    @DeleteMapping("/{matchId}")
    public ResponseEntity<Void> cancelMatch(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable Long matchId
    ) {
        Long userId = requireDriverId(userDetails);
        matchService.cancelMatch(userId, "ROLE_DRIVER", matchId);
        return ResponseEntity.noContent().build();
    }

    /**
     * 매칭 상세 조회 (기사: 본인이 수락한 매칭만)
     * GET /api/driver/matches/{matchId}
     */
    @GetMapping("/{matchId}")
    public ResponseEntity<MatchResponse> getMatch(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable Long matchId
    ) {
        Long userId = requireDriverId(userDetails);
        MatchResponse response = matchService.getMatch(matchId, userId, "ROLE_DRIVER");
        return ResponseEntity.ok(response);
    }
}
