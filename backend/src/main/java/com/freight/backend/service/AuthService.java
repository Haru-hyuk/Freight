package com.freight.backend.service;

import com.freight.backend.config.jwt.JwtTokenProvider;
import com.freight.backend.dto.auth.LoginRequest;
import com.freight.backend.dto.auth.MeResponse;
import com.freight.backend.dto.auth.MeUpdateRequest;
import com.freight.backend.dto.auth.TokenResponse;
import com.freight.backend.entity.Admin;
import com.freight.backend.entity.Driver;
import com.freight.backend.entity.Shipper;
import com.freight.backend.exception.CustomException;
import com.freight.backend.exception.ErrorCode;
import com.freight.backend.repository.AdminRepository;
import com.freight.backend.repository.DriverRepository;
import com.freight.backend.repository.ShipperRepository;
import jakarta.transaction.Transactional;
import java.util.Locale;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final DriverRepository driverRepository;
    private final ShipperRepository shipperRepository;
    private final AdminRepository adminRepository;
    private final JwtTokenProvider jwtTokenProvider;
    private final BCryptPasswordEncoder passwordEncoder;

    @Transactional
    public TokenResponse loginDriver(LoginRequest req) {
        Driver driver = driverRepository.findByEmail(req.getEmail())
                .orElseThrow(() -> new CustomException(ErrorCode.AUTH_UNAUTHORIZED));

        if (!passwordEncoder.matches(req.getPassword(), driver.getPasswordHash())) {
            throw new CustomException(ErrorCode.AUTH_UNAUTHORIZED);
        }

        return issueAccessToken(driver.getDriverId(), driver.getEmail(), "DRIVER");
    }

    @Transactional
    public TokenResponse loginShipper(LoginRequest req) {
        Shipper shipper = shipperRepository.findByEmail(req.getEmail())
                .orElseThrow(() -> new CustomException(ErrorCode.AUTH_UNAUTHORIZED));

        if (!passwordEncoder.matches(req.getPassword(), shipper.getPasswordHash())) {
            throw new CustomException(ErrorCode.AUTH_UNAUTHORIZED);
        }

        return issueAccessToken(shipper.getShipperId(), shipper.getEmail(), "SHIPPER");
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
        return issueAccessToken(admin.getAdminId(), admin.getEmail(), role);
    }

    private TokenResponse issueAccessToken(Long userId, String email, String role) {
        String accessToken = jwtTokenProvider.generateAccessToken(userId, email, role);
        String refreshToken = jwtTokenProvider.generateRefreshToken(userId, email, role);

        return TokenResponse.builder()
                .accessToken(accessToken)
                .refreshToken(refreshToken)
                .tokenType("Bearer")
                .expiresIn(jwtTokenProvider.getAccessTokenExpirationSeconds())
                .role(role.toLowerCase())
                .userId(String.valueOf(userId))
                .build();
    }

    @Transactional
    public TokenResponse refreshToken(String refreshToken) {
        try {
            jwtTokenProvider.validateTokenOrThrow(refreshToken);
        } catch (Exception e) {
            throw new CustomException(ErrorCode.AUTH_UNAUTHORIZED);
        }

        String userId = jwtTokenProvider.getUserIdFromToken(refreshToken);
        String email = jwtTokenProvider.getEmailFromToken(refreshToken);
        String role = jwtTokenProvider.getRoleFromToken(refreshToken);

        return issueAccessToken(Long.parseLong(userId), email, role);
    }

    @Transactional
    public MeResponse updateMe(Long userId, String role, MeUpdateRequest req) {
        String normalizedRole = normalizeRole(role);
        return switch (normalizedRole) {
            case "driver" -> updateDriver(userId, req);
            case "shipper" -> updateShipper(userId, req);
            case "admin" -> updateAdmin(userId, req);
            default -> throw new CustomException(ErrorCode.AUTH_FORBIDDEN);
        };
    }

    private MeResponse updateDriver(Long userId, MeUpdateRequest req) {
        Driver driver = driverRepository.findById(userId)
                .orElseThrow(() -> new CustomException(ErrorCode.AUTH_FORBIDDEN));

        String nextName = resolveString(req.getName(), driver.getName());
        String nextEmail = resolveString(req.getEmail(), driver.getEmail());
        String nextPhone = resolveString(req.getPhone(), driver.getPhone());

        validatePhone(nextPhone);
        validateEmailUniqueForDriver(nextEmail, driver.getDriverId());

        driver.updateProfile(nextName, nextEmail, nextPhone);
        Driver saved = driverRepository.save(driver);
        return MeResponse.builder()
                .id(String.valueOf(saved.getDriverId()))
                .role("driver")
                .email(saved.getEmail())
                .name(saved.getName())
                .phone(saved.getPhone())
                .build();
    }

    private MeResponse updateShipper(Long userId, MeUpdateRequest req) {
        Shipper shipper = shipperRepository.findById(userId)
                .orElseThrow(() -> new CustomException(ErrorCode.AUTH_FORBIDDEN));

        String nextName = resolveString(req.getName(), shipper.getName());
        String nextEmail = resolveString(req.getEmail(), shipper.getEmail());
        String nextPhone = resolveString(req.getPhone(), shipper.getPhone());

        validatePhone(nextPhone);
        validateEmailUniqueForShipper(nextEmail, shipper.getShipperId());

        shipper.updateProfile(nextName, nextEmail, nextPhone);
        Shipper saved = shipperRepository.save(shipper);
        return MeResponse.builder()
                .id(String.valueOf(saved.getShipperId()))
                .role("shipper")
                .email(saved.getEmail())
                .name(saved.getName())
                .phone(saved.getPhone())
                .build();
    }

    private MeResponse updateAdmin(Long userId, MeUpdateRequest req) {
        Admin admin = adminRepository.findById(userId)
                .orElseThrow(() -> new CustomException(ErrorCode.AUTH_FORBIDDEN));

        String nextName = resolveString(req.getName(), admin.getName());
        String nextEmail = resolveString(req.getEmail(), admin.getEmail());
        String nextPhone = resolveString(req.getPhone(), admin.getPhone());

        validatePhone(nextPhone);
        validateEmailUniqueForAdmin(nextEmail, admin.getAdminId());

        admin.updateProfile(nextName, nextEmail, nextPhone);
        Admin saved = adminRepository.save(admin);
        return MeResponse.builder()
                .id(String.valueOf(saved.getAdminId()))
                .role("admin")
                .email(saved.getEmail())
                .name(saved.getName())
                .phone(saved.getPhone())
                .build();
    }

    private void validateEmailUniqueForDriver(String email, Long userId) {
        driverRepository.findByEmail(email).ifPresent(found -> {
            if (!found.getDriverId().equals(userId)) {
                throw new CustomException(ErrorCode.DUPLICATE_EMAIL);
            }
        });
    }

    private void validateEmailUniqueForShipper(String email, Long userId) {
        shipperRepository.findByEmail(email).ifPresent(found -> {
            if (!found.getShipperId().equals(userId)) {
                throw new CustomException(ErrorCode.DUPLICATE_EMAIL);
            }
        });
    }

    private void validateEmailUniqueForAdmin(String email, Long userId) {
        adminRepository.findByEmail(email).ifPresent(found -> {
            if (!found.getAdminId().equals(userId)) {
                throw new CustomException(ErrorCode.DUPLICATE_EMAIL);
            }
        });
    }

    private String resolveString(String candidate, String fallback) {
        if (candidate == null) {
            return fallback;
        }
        String trimmed = candidate.trim();
        if (trimmed.isEmpty()) {
            throw new CustomException(ErrorCode.INVALID_INPUT_VALUE);
        }
        return trimmed;
    }

    private void validatePhone(String phone) {
        if (phone == null) {
            return;
        }
        if (!phone.matches("^[0-9+()\\-\\s]{8,30}$")) {
            throw new CustomException(ErrorCode.INVALID_INPUT_VALUE);
        }
    }

    private String normalizeRole(String role) {
        if (role == null) {
            return "";
        }
        return role.trim().toLowerCase(Locale.ROOT);
    }
}
