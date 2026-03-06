package com.freight.backend.controller;

import com.freight.backend.dto.match.MatchCreateRequest;
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
import lombok.extern.slf4j.Slf4j;
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
 * 화주용 매칭 API
 * Base path: /api/shipper/matches
 * 인증: JWT (Bearer), ROLE_SHIPPER
 */
@RestController
@RequestMapping("/api/shipper/matches")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "Shipper Match", description = "화주용 매칭 API")
public class ShipperMatchController {

    private final MatchService matchService;

    @Operation(summary = "매칭 생성")
    @ApiResponse(
            responseCode = "200",
            description = "생성된 매칭 정보 반환",
            content = @Content(
                    mediaType = "application/json",
                    schema = @Schema(implementation = MatchResponse.class)
            )
    )
    @PostMapping
    public ResponseEntity<MatchResponse> createMatch(
            @AuthenticationPrincipal UserDetails userDetails,
            @Valid @RequestBody MatchCreateRequest request
    ) {
        Long shipperId = SecurityUtils.requireShipperId(userDetails);
        MatchResponse response = matchService.createMatch(shipperId, request.getQuoteId());
        return ResponseEntity.ok(response);
    }

    @Operation(summary = "내 매칭 목록 조회")
    @ApiResponse(
            responseCode = "200",
            description = "매칭 목록 반환",
            content = @Content(
                    mediaType = "application/json",
                    array = @ArraySchema(schema = @Schema(implementation = MatchResponse.class))
            )
    )
    @GetMapping("/me")
    public ResponseEntity<List<MatchResponse>> getMyMatches(
            @AuthenticationPrincipal UserDetails userDetails
    ) {
        Long shipperId = SecurityUtils.requireShipperId(userDetails);
        List<MatchResponse> matches = matchService.getShipperMatches(shipperId);
        return ResponseEntity.ok(matches);
    }

    @Operation(summary = "매칭 취소")
    @ApiResponse(responseCode = "204", description = "취소 완료")
    @DeleteMapping("/{matchId}")
    public ResponseEntity<Void> cancelMatch(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable Long matchId
    ) {
        Long userId = SecurityUtils.requireShipperId(userDetails);
        matchService.cancelMatch(userId, "ROLE_SHIPPER", matchId);
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
        Long userId = SecurityUtils.requireShipperId(userDetails);
        MatchResponse response = matchService.getMatch(matchId, userId, "ROLE_SHIPPER");
        return ResponseEntity.ok(response);
    }
}
