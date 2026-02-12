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
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "notifications")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Notification {

    public enum Type {
        MATCH_CREATED,
        MATCH_ACCEPTED,
        MATCH_CANCELLED,
        COUNTER_OFFER_CREATED,
        COUNTER_OFFER_ACCEPTED,
        COUNTER_OFFER_REJECTED
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
    @Column(name = "type", length = 50)
    private Type type;

    @Column(name = "message", columnDefinition = "TEXT")
    private String message;

    @Column(name = "is_read", nullable = false)
    private Boolean isRead;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Builder
    private Notification(Long matchId, Long receiverId, Type type, String message) {
        this.matchId = matchId;
        this.receiverId = receiverId;
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
}
