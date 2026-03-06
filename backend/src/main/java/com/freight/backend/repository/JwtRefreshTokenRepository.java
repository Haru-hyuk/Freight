package com.freight.backend.repository;

import com.freight.backend.entity.JwtRefreshToken;
import java.time.LocalDateTime;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface JwtRefreshTokenRepository extends JpaRepository<JwtRefreshToken, Long> {

    Optional<JwtRefreshToken> findByJti(String jti);

    // 동일 사용자의 기존 활성 리프레시 토큰은 발급 시점에 폐기해 세션 충돌을 줄인다.
    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("""
            update JwtRefreshToken t
               set t.revokedAt = :revokedAt
             where t.userType = :userType
               and t.userId = :userId
               and t.revokedAt is null
            """)
    int revokeActiveTokensByUser(
            @Param("userType") JwtRefreshToken.UserType userType,
            @Param("userId") Long userId,
            @Param("revokedAt") LocalDateTime revokedAt
    );
}
