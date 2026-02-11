package com.freight.backend.controller;

import com.freight.backend.dto.payment.PaymentConfirmRequest;
import com.freight.backend.dto.payment.PaymentCreateRequest;
import com.freight.backend.dto.payment.PaymentPrepareRequest;
import com.freight.backend.dto.payment.PaymentPrepareResponse;
import com.freight.backend.dto.payment.PaymentResponse;
import com.freight.backend.exception.CustomException;
import com.freight.backend.exception.ErrorCode;
import com.freight.backend.service.PaymentService;
import jakarta.validation.Valid;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * 화주용 결제 API
 * - 토스페이먼츠 연동: prepare(준비) → 결제창 → confirm(승인)
 * - 수동 결제 생성, 단건/매칭별 조회, 토스 결제 준비/승인.
 * Base path: /api/shipper/payments (화주 ROLE_SHIPPER만 해당 매칭 견적 소유 시 결제 가능).
 */
@RestController
@RequestMapping("/api/shipper/payments")
@RequiredArgsConstructor
public class PaymentController {

    private final PaymentService paymentService;

    private static Long requireShipperId(UserDetails userDetails) {
        if (userDetails == null || !userDetails.getAuthorities().contains(new SimpleGrantedAuthority("ROLE_SHIPPER"))) {
            throw new CustomException(ErrorCode.AUTH_FORBIDDEN);
        }
        return Long.parseLong(userDetails.getUsername());
    }

    /** 수동 결제 생성 (토스 연동 없이 DB에만 저장). 해당 매칭의 견적 소유 화주만 가능. */
    @PostMapping
    public ResponseEntity<PaymentResponse> create(
            @AuthenticationPrincipal UserDetails userDetails,
            @Valid @RequestBody PaymentCreateRequest req
    ) {
        Long shipperId = requireShipperId(userDetails);
        return ResponseEntity.ok(paymentService.create(req, shipperId));
    }

    /** 토스 결제 준비: orderId 발급 + DB에 PENDING 결제 저장. 해당 매칭의 견적 소유 화주만 가능. */
    @PostMapping("/prepare")
    public ResponseEntity<PaymentPrepareResponse> prepare(
            @AuthenticationPrincipal UserDetails userDetails,
            @Valid @RequestBody PaymentPrepareRequest req
    ) {
        Long shipperId = requireShipperId(userDetails);
        return ResponseEntity.ok(paymentService.prepareForToss(req, shipperId));
    }

    /** 토스 결제 승인: 결제창 성공 후 paymentKey로 토스 API 호출. 해당 매칭의 견적 소유 화주만 가능. */
    @PostMapping("/confirm")
    public ResponseEntity<PaymentResponse> confirm(
            @AuthenticationPrincipal UserDetails userDetails,
            @Valid @RequestBody PaymentConfirmRequest req
    ) {
        Long shipperId = requireShipperId(userDetails);
        return ResponseEntity.ok(paymentService.confirmWithToss(req, shipperId));
    }

    /** 화주가 결제한 결제 목록 조회 (내 결제 목록, 최신순) */
    @GetMapping("/me")
    public ResponseEntity<List<PaymentResponse>> getMyPayments(
            @AuthenticationPrincipal UserDetails userDetails
    ) {
        Long shipperId = requireShipperId(userDetails);
        return ResponseEntity.ok(paymentService.getShipperPayments(shipperId));
    }

    /** 결제 단건 조회 */
    @GetMapping("/{paymentId}")
    public ResponseEntity<PaymentResponse> getById(@PathVariable Long paymentId) {
        return ResponseEntity.ok(paymentService.getById(paymentId));
    }

    /** 매칭별 결제 목록 조회 (query: ?matchId=) */
    @GetMapping
    public ResponseEntity<List<PaymentResponse>> getByMatchId(@RequestParam Long matchId) {
        return ResponseEntity.ok(paymentService.getByMatchId(matchId));
    }
}
