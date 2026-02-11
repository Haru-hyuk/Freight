package com.freight.backend.controller;

import com.freight.backend.dto.match.MatchCreateRequest;
import com.freight.backend.dto.match.MatchResponse;
import com.freight.backend.service.MatchService;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * 매칭 API 컨트롤러
 *
 * Base path: /api/matches
 * 인증: JWT (Bearer)
 */
@RestController
@RequestMapping("/api/matches")
@RequiredArgsConstructor
public class MatchController {

    private final MatchService matchService;

    /**
     * 매칭 생성 (화주)
     * POST /api/matches
     *
     * @param userDetails 현재 인증된 화주
     * @param request     { quoteId: Long }
     * @return MatchResponse
     */
    @PostMapping
    public ResponseEntity<MatchResponse> createMatch(
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestBody MatchCreateRequest request
    ) {
        Long shipperId = Long.parseLong(userDetails.getUsername());
        MatchResponse response = matchService.createMatch(shipperId, request.getQuoteId());
        return ResponseEntity.ok(response);
    }

    /**
     * 수락 가능 매칭 목록 (기사)
     * GET /api/matches/me
     * 매칭.md 2.2: 아직 아무도 수락하지 않은 매칭(accepted = false) 목록 반환
     *
     * @return 아직 수락되지 않은 매칭 목록
     */
    @GetMapping("/me")
    public ResponseEntity<List<MatchResponse>> getOpenMatches() {
        List<MatchResponse> matches = matchService.getOpenMatches();
        return ResponseEntity.ok(matches);
    }

    /**
     * 매칭 수락 (기사)
     * POST /api/matches/{matchId}/accept
     *
     * @param userDetails 현재 인증된 기사
     * @param matchId     수락할 매칭 ID
     * @return MatchResponse
     */
    @PostMapping("/{matchId}/accept")
    public ResponseEntity<MatchResponse> acceptMatch(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable Long matchId
    ) {
        Long driverId = Long.parseLong(userDetails.getUsername());
        MatchResponse response = matchService.acceptMatch(driverId, matchId);
        return ResponseEntity.ok(response);
    }

    /**
     * 매칭 취소 (화주 또는 기사)
     * DELETE /api/matches/{matchId}
     *
     * @param userDetails 현재 인증된 사용자
     * @param matchId     취소할 매칭 ID
     * @return 204 No Content
     */
    @DeleteMapping("/{matchId}")
    public ResponseEntity<Void> cancelMatch(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable Long matchId
    ) {
        Long userId = Long.parseLong(userDetails.getUsername());
        String role = userDetails.getAuthorities().stream()
                .findFirst()
                .map(a -> a.getAuthority())
                .orElse("");
        matchService.cancelMatch(userId, role, matchId);
        return ResponseEntity.noContent().build();
    }

    /**
     * 매칭 상세 조회
     * GET /api/matches/{matchId}
     *
     * @param matchId 조회할 매칭 ID
     * @return MatchResponse
     */
    @GetMapping("/{matchId}")
    public ResponseEntity<MatchResponse> getMatch(@PathVariable Long matchId) {
        MatchResponse response = matchService.getMatch(matchId);
        return ResponseEntity.ok(response);
    }
}
