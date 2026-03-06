package com.freight.backend.service;

import com.freight.backend.config.jwt.JwtTokenProvider;
import com.freight.backend.dto.auth.LoginRequest;
import com.freight.backend.dto.auth.TokenResponse;
import com.freight.backend.entity.Admin;
import com.freight.backend.entity.Driver;
import com.freight.backend.entity.JwtRefreshToken;
import com.freight.backend.entity.Shipper;
import com.freight.backend.exception.CustomException;
import com.freight.backend.exception.ErrorCode;
import com.freight.backend.repository.AdminRepository;
import com.freight.backend.repository.DriverRepository;
import com.freight.backend.repository.JwtRefreshTokenRepository;
import com.freight.backend.repository.ShipperRepository;
import io.jsonwebtoken.JwtException;
import jakarta.transaction.Transactional;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.Base64;
import java.util.Date;
import java.util.Locale;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final DriverRepository driverRepository;
    private final ShipperRepository shipperRepository;
    private final AdminRepository adminRepository;
    private final JwtRefreshTokenRepository jwtRefreshTokenRepository;
    private final JwtTokenProvider jwtTokenProvider;
    private final PasswordEncoder passwordEncoder;

    @Transactional
    public TokenResponse loginDriver(LoginRequest req) {
        Driver driver = driverRepository.findByEmail(req.getEmail())
                .orElseThrow(() -> new CustomException(ErrorCode.AUTH_UNAUTHORIZED));

        if (!passwordEncoder.matches(req.getPassword(), driver.getPasswordHash())) {
            throw new CustomException(ErrorCode.AUTH_UNAUTHORIZED);
        }

        return issueTokenPair(driver.getDriverId(), driver.getEmail(), "DRIVER", JwtRefreshToken.UserType.DRIVER);
    }

    @Transactional
    public TokenResponse loginShipper(LoginRequest req) {
        Shipper shipper = shipperRepository.findByEmail(req.getEmail())
                .orElseThrow(() -> new CustomException(ErrorCode.AUTH_UNAUTHORIZED));

        if (!passwordEncoder.matches(req.getPassword(), shipper.getPasswordHash())) {
            throw new CustomException(ErrorCode.AUTH_UNAUTHORIZED);
        }

        return issueTokenPair(shipper.getShipperId(), shipper.getEmail(), "SHIPPER", JwtRefreshToken.UserType.SHIPPER);
    }

    @Transactional
    public TokenResponse loginAdmin(LoginRequest req) {
        Admin admin = adminRepository.findByEmail(req.getEmail())
                .orElseThrow(() -> new CustomException(ErrorCode.AUTH_UNAUTHORIZED));

        if (!passwordEncoder.matches(req.getPassword(), admin.getPasswordHash())) {
            throw new CustomException(ErrorCode.AUTH_UNAUTHORIZED);
        }

        String role = admin.getRole() == null || admin.getRole().isBlank()
                ? "ADMIN"
                : admin.getRole();
        return issueTokenPair(admin.getAdminId(), admin.getEmail(), role, JwtRefreshToken.UserType.ADMIN);
    }

    private TokenResponse issueTokenPair(
            Long userId,
            String email,
            String role,
            JwtRefreshToken.UserType userType
    ) {
        String accessToken = jwtTokenProvider.generateAccessToken(userId, email, role);
        String refreshJti = UUID.randomUUID().toString().replace("-", "");
        String refreshToken = jwtTokenProvider.generateRefreshToken(userId, email, role, refreshJti);
        saveRefreshToken(userType, userId, refreshJti, refreshToken);

        return TokenResponse.builder()
                .accessToken(accessToken)
                .refreshToken(refreshToken)
                .tokenType("Bearer")
                .expiresIn(jwtTokenProvider.getAccessTokenExpirationSeconds())
                .role(role.toLowerCase(Locale.ROOT))
                .userId(String.valueOf(userId))
                .build();
    }

    @Transactional
    public TokenResponse refreshToken(String refreshToken) {
        LocalDateTime now = LocalDateTime.now();
        try {
            jwtTokenProvider.validateRefreshTokenOrThrow(refreshToken);
        } catch (JwtException | IllegalArgumentException e) {
            throw new CustomException(ErrorCode.AUTH_UNAUTHORIZED);
        }

        String jti = jwtTokenProvider.getJtiFromToken(refreshToken);
        if (jti == null || jti.isBlank()) {
            throw new CustomException(ErrorCode.AUTH_UNAUTHORIZED);
        }

        JwtRefreshToken persisted = jwtRefreshTokenRepository.findByJti(jti)
                .orElseThrow(() -> new CustomException(ErrorCode.AUTH_UNAUTHORIZED));
        String refreshTokenHash = hashToken(refreshToken);
        if (persisted.isRevoked() || persisted.isExpired(now) || !persisted.matchesHash(refreshTokenHash)) {
            throw new CustomException(ErrorCode.AUTH_UNAUTHORIZED);
        }

        String userId = jwtTokenProvider.getUserIdFromToken(refreshToken);
        Long parsedUserId;
        try {
            parsedUserId = Long.parseLong(userId);
        } catch (NumberFormatException ex) {
            throw new CustomException(ErrorCode.AUTH_UNAUTHORIZED);
        }
        if (!parsedUserId.equals(persisted.getUserId())) {
            throw new CustomException(ErrorCode.AUTH_UNAUTHORIZED);
        }

        String email = jwtTokenProvider.getEmailFromToken(refreshToken);
        String role = jwtTokenProvider.getRoleFromToken(refreshToken);
        if (email == null || email.isBlank() || role == null || role.isBlank()) {
            throw new CustomException(ErrorCode.AUTH_UNAUTHORIZED);
        }
        if (!isRoleMatchedWithUserType(role, persisted.getUserType())) {
            throw new CustomException(ErrorCode.AUTH_UNAUTHORIZED);
        }

        // 재사용 방지를 위해 사용된 refresh 토큰은 즉시 폐기한다.
        persisted.revoke(now);
        jwtRefreshTokenRepository.save(persisted);

        return issueTokenPair(parsedUserId, email, role, persisted.getUserType());
    }

    @Transactional
    public void logout(Long userId, String role) {
        JwtRefreshToken.UserType userType = resolveUserType(role);
        jwtRefreshTokenRepository.revokeActiveTokensByUser(userType, userId, LocalDateTime.now());
    }

    private void saveRefreshToken(
            JwtRefreshToken.UserType userType,
            Long userId,
            String refreshJti,
            String refreshToken
    ) {
        String refreshTokenHash = hashToken(refreshToken);
        LocalDateTime now = LocalDateTime.now();
        LocalDateTime issuedAt = toLocalDateTime(
                jwtTokenProvider.getIssuedAtFromToken(refreshToken),
                now
        );
        LocalDateTime expiresAt = toLocalDateTime(
                jwtTokenProvider.getExpirationFromToken(refreshToken),
                now.plusSeconds(jwtTokenProvider.getRefreshTokenExpirationSeconds())
        );

        jwtRefreshTokenRepository.revokeActiveTokensByUser(userType, userId, now);
        JwtRefreshToken token = JwtRefreshToken.issue(
                userType,
                userId,
                refreshTokenHash,
                refreshJti,
                issuedAt,
                expiresAt
        );
        jwtRefreshTokenRepository.save(token);
    }

    private LocalDateTime toLocalDateTime(Date date, LocalDateTime fallback) {
        if (date == null) {
            return fallback;
        }
        return LocalDateTime.ofInstant(date.toInstant(), ZoneId.systemDefault());
    }

    private String hashToken(String token) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hashed = digest.digest(token.getBytes(StandardCharsets.UTF_8));
            return Base64.getEncoder().encodeToString(hashed);
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 algorithm is not available", e);
        }
    }

    private JwtRefreshToken.UserType resolveUserType(String role) {
        String normalized = role == null ? "" : role.trim().toUpperCase(Locale.ROOT);
        if (normalized.startsWith("ROLE_")) {
            normalized = normalized.substring(5);
        }
        return switch (normalized) {
            case "DRIVER" -> JwtRefreshToken.UserType.DRIVER;
            case "SHIPPER" -> JwtRefreshToken.UserType.SHIPPER;
            case "ADMIN", "SUPER", "OPERATOR", "CS" -> JwtRefreshToken.UserType.ADMIN;
            default -> throw new CustomException(ErrorCode.AUTH_UNAUTHORIZED);
        };
    }

    private boolean isRoleMatchedWithUserType(String role, JwtRefreshToken.UserType userType) {
        if (userType == null) {
            return false;
        }
        return resolveUserType(role) == userType;
    }
}
