package com.freight.backend.service;

import com.freight.backend.config.jwt.JwtTokenProvider;
import com.freight.backend.dto.auth.LoginRequest;
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
        String accessToken = jwtTokenProvider.generateAccessToken(
                userId,
                email,
                role
        );

        return new TokenResponse(
                accessToken,
                "Bearer",
                jwtTokenProvider.getAccessTokenExpirationSeconds()
        );
    }
}
