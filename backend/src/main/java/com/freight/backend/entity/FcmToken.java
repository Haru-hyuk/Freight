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
import java.time.LocalDateTime;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Table(
        name = "push_devices",
        indexes = {
                @Index(name = "idx_push_devices_user_type_user_id_active", columnList = "user_type, user_id, is_active"),
                @Index(name = "idx_push_devices_last_seen_at", columnList = "last_seen_at")
        }
)
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class FcmToken {

    public enum UserType {
        DRIVER, SHIPPER, ADMIN
    }

    public enum DeviceType {
        ANDROID, IOS, WEB
    }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "device_id")
    private Long id;

    @Enumerated(EnumType.STRING)
    @Column(name = "user_type", nullable = false, length = 20)
    private UserType userType;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Enumerated(EnumType.STRING)
    @Column(name = "device_type", nullable = false, length = 20)
    private DeviceType deviceType;

    @Column(name = "fcm_token", nullable = false, unique = true, length = 512)
    private String fcmToken;

    @Column(name = "is_active", nullable = false)
    private Boolean isActive;

    @Column(name = "last_seen_at")
    private LocalDateTime lastSeenAt;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @Builder
    private FcmToken(UserType userType, Long userId, DeviceType deviceType, String fcmToken) {
        this.userType = userType;
        this.userId = userId;
        this.deviceType = deviceType;
        this.fcmToken = fcmToken;
        this.isActive = true;
    }

    @PrePersist
    protected void onCreate() {
        LocalDateTime now = LocalDateTime.now();
        if (createdAt == null) {
            createdAt = now;
        }
        if (lastSeenAt == null) {
            lastSeenAt = now;
        }
        updatedAt = now;
        if (isActive == null) {
            isActive = true;
        }
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }

    public void activate(UserType userType, Long userId, DeviceType deviceType) {
        this.userType = userType;
        this.userId = userId;
        this.deviceType = deviceType;
        this.isActive = true;
        this.lastSeenAt = LocalDateTime.now();
    }

    public void deactivate() {
        this.isActive = false;
        this.lastSeenAt = LocalDateTime.now();
    }
}
