package com.freight.backend.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import java.time.LocalDateTime;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "counter_offers")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class CounterOffer {

    public enum Status {
        PENDING,
        ACCEPTED,
        REJECTED
    }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "counter_offer_id")
    private Long counterOfferId;

    @Column(name = "quote_id", nullable = false)
    private Long quoteId;

    @Column(name = "driver_id", nullable = false)
    private Long driverId;

    @Column(name = "proposed_price", nullable = false)
    private Integer proposedPrice;

    @Column(name = "message", columnDefinition = "TEXT")
    private String message;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false)
    private Status status;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "responded_at")
    private LocalDateTime respondedAt;

    @Builder
    private CounterOffer(Long quoteId, Long driverId, Integer proposedPrice, String message) {
        this.quoteId = quoteId;
        this.driverId = driverId;
        this.proposedPrice = proposedPrice;
        this.message = message;
        this.status = Status.PENDING;
    }

    @PrePersist
    void onCreate() {
        if (createdAt == null) {
            createdAt = LocalDateTime.now();
        }
        if (status == null) {
            status = Status.PENDING;
        }
    }

    @PreUpdate
    void onUpdate() {
        if (status != Status.PENDING && respondedAt == null) {
            respondedAt = LocalDateTime.now();
        }
    }

    public void accept() {
        this.status = Status.ACCEPTED;
        this.respondedAt = LocalDateTime.now();
    }

    public void reject() {
        this.status = Status.REJECTED;
        this.respondedAt = LocalDateTime.now();
    }
}
