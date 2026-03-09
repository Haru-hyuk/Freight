package com.freight.backend.controller;

import com.freight.backend.dto.match.BatchAcceptMatchRequest;
import com.freight.backend.dto.match.BatchAcceptMatchResponse;
import com.freight.backend.dto.match.BatchStartTransitRequest;
import com.freight.backend.dto.match.BatchStartTransitResponse;
import com.freight.backend.dto.match.MatchResponse;
import com.freight.backend.service.MatchService;
import com.freight.backend.util.SecurityUtils;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.ArraySchema;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
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
@Tag(name = "Driver Match", description = "기사용 매칭 API")
public class DriverMatchController {

    private final MatchService matchService;

    @Operation(summary = "수락 가능 매칭 목록 조회")
    @ApiResponse(
            responseCode = "200",
            description = "수락 가능한 매칭 목록 반환",
            content = @Content(
                    mediaType = "application/json",
                    array = @ArraySchema(schema = @Schema(implementation = MatchResponse.class))
            )
    )
    @GetMapping
    public ResponseEntity<List<MatchResponse>> getOpenMatches(
            @AuthenticationPrincipal UserDetails userDetails
    ) {
        SecurityUtils.requireDriverId(userDetails);
        List<MatchResponse> matches = matchService.getOpenMatches();
        return ResponseEntity.ok(matches);
    }

    @Operation(summary = "내 매칭 목록 조회")
    @ApiResponse(
            responseCode = "200",
            description = "기사가 수락한 매칭 목록 반환",
            content = @Content(
                    mediaType = "application/json",
                    array = @ArraySchema(schema = @Schema(implementation = MatchResponse.class))
            )
    )
    @GetMapping("/me")
    public ResponseEntity<List<MatchResponse>> getMyMatches(
            @AuthenticationPrincipal UserDetails userDetails
    ) {
        Long driverId = SecurityUtils.requireDriverId(userDetails);
        List<MatchResponse> matches = matchService.getDriverMatches(driverId);
        return ResponseEntity.ok(matches);
    }

    @Operation(summary = "매칭 수락")
    @ApiResponse(
            responseCode = "200",
            description = "수락된 매칭 정보 반환",
            content = @Content(
                    mediaType = "application/json",
                    schema = @Schema(implementation = MatchResponse.class)
            )
    )
    @PostMapping("/{matchId}/accept")
    public ResponseEntity<MatchResponse> acceptMatch(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable Long matchId
    ) {
        Long driverId = SecurityUtils.requireDriverId(userDetails);
        MatchResponse response = matchService.acceptMatch(driverId, matchId);
        return ResponseEntity.ok(response);
    }

    @Operation(summary = "매칭 다건 수락")
    @ApiResponse(
            responseCode = "200",
            description = "수락된 매칭 목록 반환",
            content = @Content(
                    mediaType = "application/json",
                    schema = @Schema(implementation = BatchAcceptMatchResponse.class)
            )
    )
    @PostMapping("/accept-batch")
    public ResponseEntity<BatchAcceptMatchResponse> acceptMatches(
            @AuthenticationPrincipal UserDetails userDetails,
            @Valid @RequestBody BatchAcceptMatchRequest request
    ) {
        Long driverId = SecurityUtils.requireDriverId(userDetails);
        BatchAcceptMatchResponse response = matchService.acceptMatches(driverId, request);
        return ResponseEntity.ok(response);
    }

    @Operation(summary = "운송 시작")
    @ApiResponse(
            responseCode = "200",
            description = "운송 시작된 매칭 정보 반환",
            content = @Content(
                    mediaType = "application/json",
                    schema = @Schema(implementation = MatchResponse.class)
            )
    )
    @PostMapping("/{matchId}/start")
    public ResponseEntity<MatchResponse> startTransit(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable Long matchId
    ) {
        Long driverId = SecurityUtils.requireDriverId(userDetails);
        MatchResponse response = matchService.startTransit(driverId, matchId);
        return ResponseEntity.ok(response);
    }

    @Operation(summary = "운송 다건 시작 (그룹 오더)")
    @ApiResponse(
            responseCode = "200",
            description = "운송 시작된 매칭 목록 반환",
            content = @Content(
                    mediaType = "application/json",
                    schema = @Schema(implementation = BatchStartTransitResponse.class)
            )
    )
    @PostMapping("/start-batch")
    public ResponseEntity<BatchStartTransitResponse> batchStartTransit(
            @AuthenticationPrincipal UserDetails userDetails,
            @Valid @RequestBody BatchStartTransitRequest request
    ) {
        Long driverId = SecurityUtils.requireDriverId(userDetails);
        BatchStartTransitResponse response = matchService.batchStartTransit(driverId, request);
        return ResponseEntity.ok(response);
    }

    @Operation(summary = "운송 완료")
    @ApiResponse(
            responseCode = "200",
            description = "운송 완료된 매칭 정보 반환",
            content = @Content(
                    mediaType = "application/json",
                    schema = @Schema(implementation = MatchResponse.class)
            )
    )
    @PostMapping("/{matchId}/complete")
    public ResponseEntity<MatchResponse> completeTransit(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable Long matchId
    ) {
        Long driverId = SecurityUtils.requireDriverId(userDetails);
        MatchResponse response = matchService.completeTransit(driverId, matchId);
        return ResponseEntity.ok(response);
    }

    @Operation(summary = "매칭 취소")
    @ApiResponse(responseCode = "204", description = "취소 완료")
    @DeleteMapping("/{matchId}")
    public ResponseEntity<Void> cancelMatch(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable Long matchId
    ) {
        Long userId = SecurityUtils.requireDriverId(userDetails);
        matchService.cancelMatch(userId, "ROLE_DRIVER", matchId);
        return ResponseEntity.noContent().build();
    }

    @Operation(summary = "매칭 상세 조회")
    @ApiResponse(
            responseCode = "200",
            description = "매칭 상세 정보 반환",
            content = @Content(
                    mediaType = "application/json",
                    schema = @Schema(implementation = MatchResponse.class)
            )
    )
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
