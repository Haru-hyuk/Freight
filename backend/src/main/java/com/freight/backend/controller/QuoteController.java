package com.freight.backend.controller;

import com.freight.backend.dto.quote.QuoteCreateRequest;
import com.freight.backend.dto.quote.QuoteCreateResponse;
import com.freight.backend.dto.quote.QuoteDetailResponse;
import com.freight.backend.dto.quote.QuoteListResponse;
import com.freight.backend.dto.quote.QuoteUpdateRequest;
import com.freight.backend.dto.quote.QuoteValidationResponse;
import com.freight.backend.service.QuoteService;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
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
public class QuoteController {

    private final QuoteService quoteService;

    @PostMapping
    public ResponseEntity<QuoteCreateResponse> createQuote(@RequestBody QuoteCreateRequest req) {
        return ResponseEntity.ok(quoteService.createQuote(req));
    }

    @PostMapping("/validate")
    public ResponseEntity<QuoteValidationResponse> validateQuote(@RequestBody QuoteCreateRequest req) {
        return ResponseEntity.ok(quoteService.validateQuote(req));
    }

    @GetMapping
    public ResponseEntity<List<QuoteListResponse>> listQuotes() {
        return ResponseEntity.ok(quoteService.listQuotes());
    }

    @GetMapping("/{quoteId}")
    public ResponseEntity<QuoteDetailResponse> getQuote(@PathVariable Long quoteId) {
        return ResponseEntity.ok(quoteService.getQuote(quoteId));
    }

    @PutMapping("/{quoteId}")
    public ResponseEntity<QuoteDetailResponse> updateQuote(
            @PathVariable Long quoteId,
            @RequestBody QuoteUpdateRequest req
    ) {
        return ResponseEntity.ok(quoteService.updateQuote(quoteId, req));
    }

    @DeleteMapping("/{quoteId}")
    public ResponseEntity<Void> deleteQuote(@PathVariable Long quoteId) {
        quoteService.deleteQuote(quoteId);
        return ResponseEntity.noContent().build();
    }
}
