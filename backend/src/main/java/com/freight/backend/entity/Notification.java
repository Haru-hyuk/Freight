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
import jakarta.persistence.Table;
import java.time.LocalDateTime;
import com.freight.backend.entity.FcmToken;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Table(
        name = "notifications",
        indexes = {
                @Index(name = "idx_notifications_receiver_type_id_created_at", columnList = "receiver_type, receiver_id, created_at"),
                @Index(name = "idx_notifications_receiver_type_id_is_read", columnList = "receiver_type, receiver_id, is_read"),
                @Index(name = "idx_notifications_match_id_is_read", columnList = "match_id, is_read")
        }
)
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Notification {

    public enum Type {
        MATCH_CREATED,
        MATCH_ACCEPTED,
        MATCH_UPDATED,
        MATCH_CANCELLED,
        COUNTER_OFFER_CREATED,
        COUNTER_OFFER_ACCEPTED,
        COUNTER_OFFER_REJECTED,
        PAYMENT_COMPLETED,
        PAYMENT_FAILED,
        DELIVERY_STARTED,
        DELIVERY_COMPLETED,
        SETTLEMENT_COMPLETED,
        SETTLEMENT_ANOMALY,  // 정산 이상 (0원/음수 등)
        DRIVER_ASSIGNED,
        SYSTEM
    }


    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "notification_id")
    private Long id;

    @Column(name = "match_id")
    private Long matchId;

    @Column(name = "receiver_id", nullable = false)
    private Long receiverId;

    @Enumerated(EnumType.STRING)
    @Column(name = "receiver_type", length = 20)
    private FcmToken.UserType receiverType;

    @Enumerated(EnumType.STRING)
    @Column(name = "type", length = 50)
    private Type type;

    @Column(name = "message", columnDefinition = "TEXT")
    private String message;

    @Column(name = "is_read", nullable = false)
    private Boolean isRead;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Builder
    private Notification(Long matchId, Long receiverId, FcmToken.UserType receiverType, Type type, String message) {
        this.matchId = matchId;
        this.receiverId = receiverId;
        this.receiverType = receiverType;
        this.type = type;
        this.message = message;
        this.isRead = false;
    }

    @PrePersist
    void onCreate() {
        if (createdAt == null) {
            createdAt = LocalDateTime.now();
        }
        if (isRead == null) {
            isRead = false;
        }
    }

    public void markRead() {
        this.isRead = true;
    }

    public void assignReceiverType(FcmToken.UserType receiverType) {
        this.receiverType = receiverType;
    }
}
