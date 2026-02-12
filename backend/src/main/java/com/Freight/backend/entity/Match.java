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
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * 매칭 엔티티
 * - 견적(Quote)과 기사(Driver)를 연결하는 핵심 엔티티
 * - 매칭 생성 시 driverId=null, accepted=false로 시작
 * - 기사가 수락하면 driverId 설정, accepted=true
 */
@Entity
@Table(name = "matches")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Builder
public class Match {

    public enum Status {
        READY,        // 대기 중 (생성 직후 또는 수락 직후)
        IN_TRANSIT,   // 운송 중
        COMPLETED,    // 운송 완료
        CANCELLED     // 취소됨
    }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "match_id")
    private Long matchId;

    @Column(name = "quote_id", nullable = false)
    private Long quoteId;

    @Setter
    @Column(name = "driver_id")
    private Long driverId;

    @Setter
    @Column(name = "accepted", nullable = false)
    private Boolean accepted;

    @Setter
    @Column(name = "accepted_at")
    private LocalDateTime acceptedAt;

    @Setter
    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false)
    private Status status;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
        if (status == null) {
            status = Status.READY;
        }
        if (accepted == null) {
            accepted = false;
        }
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }

    /**
     * 기사가 매칭 수락
     */
    public void accept(Long driverId) {
        this.driverId = driverId;
        this.accepted = true;
        this.acceptedAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
    }

    /**
     * 매칭 취소
     */
    public void cancel() {
        this.status = Status.CANCELLED;
        this.updatedAt = LocalDateTime.now();
    }

    /**
     * 운송 시작
     */
    public void startTransit() {
        this.status = Status.IN_TRANSIT;
    }

    /**
     * 운송 완료
     */
    public void complete() {
        this.status = Status.COMPLETED;
    }
}
