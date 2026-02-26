package com.freight.backend.controller;

import com.freight.backend.dto.match.BatchAcceptMatchRequest;
import com.freight.backend.dto.match.BatchAcceptMatchResponse;
import com.freight.backend.dto.match.MatchResponse;
import com.freight.backend.service.MatchService;
import com.freight.backend.util.SecurityUtils;
import jakarta.validation.Valid;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.RequestBody;
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

    /**
     * 수락 가능 매칭 목록 (아직 아무도 수락하지 않은 매칭)
     * GET /api/driver/matches
     */
    @GetMapping
    public ResponseEntity<List<MatchResponse>> getOpenMatches(
            @AuthenticationPrincipal UserDetails userDetails
    ) {
        SecurityUtils.requireDriverId(userDetails);
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
        Long driverId = SecurityUtils.requireDriverId(userDetails);
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
        Long driverId = SecurityUtils.requireDriverId(userDetails);
        MatchResponse response = matchService.acceptMatch(driverId, matchId);
        return ResponseEntity.ok(response);
    }

    /**
     * 매칭 다건 수락 (기사)
     * POST /api/driver/matches/accept-batch
     */
    @PostMapping("/accept-batch")
    public ResponseEntity<BatchAcceptMatchResponse> acceptMatches(
            @AuthenticationPrincipal UserDetails userDetails,
            @Valid @RequestBody BatchAcceptMatchRequest request
    ) {
        Long driverId = SecurityUtils.requireDriverId(userDetails);
        BatchAcceptMatchResponse response = matchService.acceptMatches(driverId, request);
        return ResponseEntity.ok(response);
    }

    /**
     * 운송 시작 (기사)
     * POST /api/driver/matches/{matchId}/start
     */
    @PostMapping("/{matchId}/start")
    public ResponseEntity<MatchResponse> startTransit(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable Long matchId
    ) {
        Long driverId = SecurityUtils.requireDriverId(userDetails);
        MatchResponse response = matchService.startTransit(driverId, matchId);
        return ResponseEntity.ok(response);
    }

    /**
     * 운송 완료 (기사)
     * POST /api/driver/matches/{matchId}/complete
     */
    @PostMapping("/{matchId}/complete")
    public ResponseEntity<MatchResponse> completeTransit(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable Long matchId
    ) {
        Long driverId = SecurityUtils.requireDriverId(userDetails);
        MatchResponse response = matchService.completeTransit(driverId, matchId);
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
        Long userId = SecurityUtils.requireDriverId(userDetails);
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
        Long userId = SecurityUtils.requireDriverId(userDetails);
        MatchResponse response = matchService.getMatch(matchId, userId, "ROLE_DRIVER");
        return ResponseEntity.ok(response);
    }
}
