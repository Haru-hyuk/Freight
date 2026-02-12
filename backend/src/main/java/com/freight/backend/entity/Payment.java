package com.freight.backend.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import java.time.LocalDateTime;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * 결제 엔티티
 * - 매칭(match) 단위로 결제 정보 저장
 * - 토스 결제 시: orderNo에 orderId 저장, pgRef에 토스 paymentKey 저장
 */
@Entity
@Table(name = "payments")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Builder
public class Payment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "payment_id")
    private Long paymentId;

    /** 결제 대상 매칭 ID */
    @Column(name = "match_id", nullable = false)
    private Long matchId;

    /** 주문 번호 (토스 결제 준비 시 orderId로 사용) */
    @Column(name = "order_no", length = 100)
    private String orderNo;

    /** 결제 수단: CARD, TRANSFER, PREPAID */
    @Enumerated(EnumType.STRING)
    @Column(name = "method", length = 20)
    private PaymentMethod method;

    /** 결제 상태: PENDING → COMPLETED / FAILED */
    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    private PaymentStatus status;

    /** 결제 완료 시각 */
    @Column(name = "paid_at")
    private LocalDateTime paidAt;

    @Column(name = "attempt_id", length = 100)
    private String attemptId;

    /** 금액 구분 (예: FREIGHT 등) */
    @Column(name = "amount_type", length = 50)
    private String amountType;

    /** PG사 결제 키 (토스 승인 성공 시 paymentKey 저장) */
    @Column(name = "pg_ref", length = 100)
    private String pgRef;

    /** 결제 금액 (원). 토스 준비 시 저장, 승인 시 검증에 사용 */
    @Column(name = "total_amount")
    private Integer totalAmount;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    public enum PaymentMethod {
        CARD, TRANSFER, PREPAID
    }

    public enum PaymentStatus {
        PENDING,   // 대기 (준비 완료 ~ 승인 전)
        COMPLETED, // 완료
        FAILED,    // 실패
        REFUNDED   // 환불
    }

    @PrePersist
    protected void onCreate() {
        if (createdAt == null) {
            createdAt = LocalDateTime.now();
        }
        if (status == null) {
            status = PaymentStatus.PENDING;
        }
    }

    /** 결제 완료 처리 (승인 성공 시 호출) */
    public void complete(LocalDateTime at, String paymentKey) {
        this.status = PaymentStatus.COMPLETED;
        this.paidAt = at != null ? at : LocalDateTime.now();
        if (paymentKey != null && !paymentKey.isBlank()) {
            this.pgRef = paymentKey;
        }
    }

    /** 결제 실패 처리 */
    public void fail() {
        this.status = PaymentStatus.FAILED;
    }
}
