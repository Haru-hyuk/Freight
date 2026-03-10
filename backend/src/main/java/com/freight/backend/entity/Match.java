package com.freight.backend.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import jakarta.persistence.Version;
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
@Table(
        name = "matches",
        indexes = {
                @Index(name = "idx_matches_quote_id", columnList = "quote_id"),
                @Index(name = "idx_matches_driver_id", columnList = "driver_id"),
                @Index(name = "idx_matches_status", columnList = "status"),
                @Index(name = "idx_matches_driver_id_status", columnList = "driver_id, status"),
                @Index(name = "idx_matches_quote_id_status", columnList = "quote_id, status")
        }
)
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

    @Setter
    @Column(name = "match_group_key")
    private String matchGroupKey;

    @Setter
    @Column(name = "match_group_type")
    private String matchGroupType;

    @Setter
    @Column(name = "match_group_order")
    private Integer matchGroupOrder;

    @Setter
    @Column(name = "location_sharing_enabled", nullable = false)
    private Boolean locationSharingEnabled;

    @Setter
    @Column(name = "location_sharing_updated_at")
    private LocalDateTime locationSharingUpdatedAt;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    /** 낙관적 락을 위한 버전 필드 - Counter Offer 레이스 컨디션 방지 */
    @Version
    @Column(name = "version")
    private Long version;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
        ensureVersionInitialized();
        if (status == null) {
            status = Status.READY;
        }
        if (accepted == null) {
            accepted = false;
        }
        if (locationSharingEnabled == null) {
            locationSharingEnabled = false;
        }
    }

    @PreUpdate
    protected void onUpdate() {
        ensureVersionInitialized();
        updatedAt = LocalDateTime.now();
    }

    /** 기사가 매칭 수락 */
    public void accept(Long driverId) {
        ensureVersionInitialized();
        this.driverId = driverId;
        this.accepted = true;
        this.acceptedAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
    }

    /** 매칭 그룹 설정 (합짐/노선조립용) */
    public void assignGroup(String groupKey, String groupType, Integer groupOrder) {
        ensureVersionInitialized();
        this.matchGroupKey = groupKey;
        this.matchGroupType = groupType;
        this.matchGroupOrder = groupOrder;
        this.updatedAt = LocalDateTime.now();
    }

    /** 매칭 취소 */
    public void cancel() {
        ensureVersionInitialized();
        this.status = Status.CANCELLED;
        this.updatedAt = LocalDateTime.now();
    }

    /** 운송 시작 (위치 공유 활성화) */
    public void startTransit() {
        ensureVersionInitialized();
        this.status = Status.IN_TRANSIT;
        this.locationSharingEnabled = true;
        this.locationSharingUpdatedAt = LocalDateTime.now();
    }

    /** 운송 완료 (위치 공유 비활성화) */
    public void complete() {
        ensureVersionInitialized();
        this.status = Status.COMPLETED;
        this.locationSharingEnabled = false;
        this.locationSharingUpdatedAt = LocalDateTime.now();
    }

    /** 위치 공유 설정 변경 */
    public void updateLocationSharing(boolean enabled) {
        ensureVersionInitialized();
        this.locationSharingEnabled = enabled;
        this.locationSharingUpdatedAt = LocalDateTime.now();
    }

    /** 재매칭 위해 매칭 해제 (결제 타임아웃 시) */
    public void releaseForRematch() {
        ensureVersionInitialized();
        this.driverId = null;
        this.accepted = false;
        this.acceptedAt = null;
        this.status = Status.READY;
        this.matchGroupKey = null;
        this.matchGroupType = null;
        this.matchGroupOrder = null;
        this.locationSharingEnabled = false;
        this.locationSharingUpdatedAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
    }

    private void ensureVersionInitialized() {
        if (this.version == null) {
            this.version = 0L;
        }
    }
}
