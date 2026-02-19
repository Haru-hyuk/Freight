package com.freight.backend.repository;

import com.freight.backend.entity.FcmToken;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface FcmTokenRepository extends JpaRepository<FcmToken, Long> {
    Optional<FcmToken> findByFcmToken(String fcmToken);

    List<FcmToken> findByUserTypeAndUserIdAndIsActiveTrue(FcmToken.UserType userType, Long userId);
}
