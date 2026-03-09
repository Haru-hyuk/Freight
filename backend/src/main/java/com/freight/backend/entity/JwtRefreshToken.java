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
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * 리프레시 토큰 DB 관리 엔티티.
 * JWT 자체 검증 + DB 저장 상태(폐기/만료)를 함께 확인하기 위해 사용한다.
 */
@Entity
@Table(
        name = "jwt_refresh_tokens",
        indexes = {
                @Index(name = "idx_jwt_user", columnList = "user_type, user_id"),
                @Index(name = "idx_jwt_jti", columnList = "jti"),
                @Index(name = "idx_jwt_expires", columnList = "expires_at")
        }
)
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Builder
public class JwtRefreshToken {

    public enum UserType {
        DRIVER,
        SHIPPER,
        ADMIN
    }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "token_id")
    private Long tokenId;

    @Enumerated(EnumType.STRING)
    @Column(name = "user_type", nullable = false, length = 20)
    private UserType userType;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(name = "refresh_token_hash", nullable = false, length = 255)
    private String refreshTokenHash;

    @Column(name = "jti", nullable = false, unique = true, length = 64)
    private String jti;

    @Column(name = "issued_at", nullable = false)
    private LocalDateTime issuedAt;

    @Column(name = "expires_at", nullable = false)
    private LocalDateTime expiresAt;

    @Column(name = "revoked_at")
    private LocalDateTime revokedAt;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    public static JwtRefreshToken issue(
            UserType userType,
            Long userId,
            String refreshTokenHash,
            String jti,
            LocalDateTime issuedAt,
            LocalDateTime expiresAt
    ) {
        return JwtRefreshToken.builder()
                .userType(userType)
                .userId(userId)
                .refreshTokenHash(refreshTokenHash)
                .jti(jti)
                .issuedAt(issuedAt)
                .expiresAt(expiresAt)
                .build();
    }

    public boolean isRevoked() {
        return revokedAt != null;
    }

    public boolean isExpired(LocalDateTime now) {
        return expiresAt != null && expiresAt.isBefore(now);
    }

    public boolean matchesHash(String tokenHash) {
        return refreshTokenHash != null && refreshTokenHash.equals(tokenHash);
    }

    public void revoke(LocalDateTime revokeTime) {
        if (revokedAt == null) {
            revokedAt = revokeTime;
        }
    }

    @PrePersist
    protected void onCreate() {
        LocalDateTime now = LocalDateTime.now();
        if (createdAt == null) {
            createdAt = now;
        }
        updatedAt = now;
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
