package com.freight.backend.controller;

import com.freight.backend.dto.quote.QuoteCreateRequest;
import com.freight.backend.dto.quote.QuoteCreateResponse;
import com.freight.backend.dto.quote.QuoteDetailResponse;
import com.freight.backend.dto.quote.QuoteEtaSuggestionRequest;
import com.freight.backend.dto.quote.QuoteEtaSuggestionResponse;
import com.freight.backend.dto.quote.QuoteListResponse;
import com.freight.backend.dto.quote.QuoteUpdateRequest;
import com.freight.backend.dto.quote.QuoteValidationResponse;
import com.freight.backend.service.QuoteService;
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
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/shipper/quotes")
@RequiredArgsConstructor
@Tag(name = "Quote", description = "화주 견적 관리 API")
public class QuoteController {

    private final QuoteService quoteService;

    @Operation(summary = "견적 생성")
    @ApiResponse(
            responseCode = "200",
            description = "생성된 견적 정보 반환",
            content = @Content(
                    mediaType = "application/json",
                    schema = @Schema(implementation = QuoteCreateResponse.class)
            )
    )
    @PostMapping
    public ResponseEntity<QuoteCreateResponse> createQuote(@Valid @RequestBody QuoteCreateRequest req) {
        return ResponseEntity.ok(quoteService.createQuote(req));
    }

    @Operation(summary = "견적 유효성 검증")
    @ApiResponse(
            responseCode = "200",
            description = "검증 결과 반환",
            content = @Content(
                    mediaType = "application/json",
                    schema = @Schema(implementation = QuoteValidationResponse.class)
            )
    )
    @PostMapping("/validate")
    public ResponseEntity<QuoteValidationResponse> validateQuote(@Valid @RequestBody QuoteCreateRequest req) {
        return ResponseEntity.ok(quoteService.validateQuote(req));
    }

    @Operation(summary = "견적 ETA(도착 시간 후보) 제안")
    @ApiResponse(
            responseCode = "200",
            description = "ETA 제안 결과 반환",
            content = @Content(
                    mediaType = "application/json",
                    schema = @Schema(implementation = QuoteEtaSuggestionResponse.class)
            )
    )
    @PostMapping("/eta-suggestion")
    @PreAuthorize("hasRole('SHIPPER')")
    public ResponseEntity<QuoteEtaSuggestionResponse> suggestEta(@Valid @RequestBody QuoteEtaSuggestionRequest req) {
        return ResponseEntity.ok(quoteService.suggestEta(req));
    }

    @Operation(summary = "견적 목록 조회")
    @ApiResponse(
            responseCode = "200",
            description = "견적 목록 반환",
            content = @Content(
                    mediaType = "application/json",
                    array = @ArraySchema(schema = @Schema(implementation = QuoteListResponse.class))
            )
    )
    @GetMapping
    public ResponseEntity<List<QuoteListResponse>> listQuotes() {
        return ResponseEntity.ok(quoteService.listQuotes());
    }

    @Operation(summary = "견적 상세 조회")
    @ApiResponse(
            responseCode = "200",
            description = "견적 상세 정보 반환",
            content = @Content(
                    mediaType = "application/json",
                    schema = @Schema(implementation = QuoteDetailResponse.class)
            )
    )
    @GetMapping("/{quoteIdentifier}")
    public ResponseEntity<QuoteDetailResponse> getQuote(@PathVariable String quoteIdentifier) {
        return ResponseEntity.ok(quoteService.getQuote(quoteIdentifier));
    }

    @Operation(summary = "견적 수정")
    @ApiResponse(
            responseCode = "200",
            description = "수정된 견적 정보 반환",
            content = @Content(
                    mediaType = "application/json",
                    schema = @Schema(implementation = QuoteDetailResponse.class)
            )
    )
    @PutMapping("/{quoteIdentifier}")
    public ResponseEntity<QuoteDetailResponse> updateQuote(
            @PathVariable String quoteIdentifier,
            @Valid @RequestBody QuoteUpdateRequest req
    ) {
        return ResponseEntity.ok(quoteService.updateQuote(quoteIdentifier, req));
    }

    @Operation(summary = "견적 삭제")
    @ApiResponse(responseCode = "204", description = "삭제 완료")
    @DeleteMapping("/{quoteIdentifier}")
    public ResponseEntity<Void> deleteQuote(@PathVariable String quoteIdentifier) {
        quoteService.deleteQuote(quoteIdentifier);
        return ResponseEntity.noContent().build();
    }
}
