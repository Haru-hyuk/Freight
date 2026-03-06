package com.freight.backend.controller;

import com.freight.backend.dto.auth.LoginRequest;
import com.freight.backend.dto.auth.MeResponse;
import com.freight.backend.dto.auth.MeUpdateRequest;
import com.freight.backend.dto.auth.RefreshTokenRequest;
import com.freight.backend.dto.auth.TokenResponse;
import com.freight.backend.entity.Admin;
import com.freight.backend.entity.Driver;
import com.freight.backend.entity.Shipper;
import com.freight.backend.exception.CustomException;
import com.freight.backend.exception.ErrorCode;
import com.freight.backend.repository.AdminRepository;
import com.freight.backend.repository.DriverRepository;
import com.freight.backend.repository.ShipperRepository;
import com.freight.backend.dto.driver.DriverSignupRequest;
import com.freight.backend.dto.driver.DriverSignupResponse;
import com.freight.backend.dto.shipper.ShipperSignupRequest;
import com.freight.backend.dto.shipper.ShipperSignupResponse;
import com.freight.backend.service.AuthService;
import com.freight.backend.service.DriverSignupService;
import com.freight.backend.service.ShipperSignupService;
import com.freight.backend.util.SecurityUtils;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.transaction.annotation.Transactional;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
@Tag(name = "Auth", description = "인증 API")
public class AuthController {

    private final AuthService authService;
    private final DriverSignupService driverSignupService;
    private final ShipperSignupService shipperSignupService;
    private final DriverRepository driverRepository;
    private final ShipperRepository shipperRepository;
    private final AdminRepository adminRepository;

    @Operation(summary = "기사 로그인")
    @ApiResponse(
            responseCode = "200",
            description = "JWT 토큰 반환",
            content = @Content(
                    mediaType = "application/json",
                    schema = @Schema(implementation = TokenResponse.class)
            )
    )
    @PostMapping("/driver/login")
    public ResponseEntity<TokenResponse> driverLogin(@Valid @RequestBody LoginRequest req) {
        return ResponseEntity.ok(authService.loginDriver(req));
    }

    @Operation(summary = "화주 로그인")
    @ApiResponse(
            responseCode = "200",
            description = "JWT 토큰 반환",
            content = @Content(
                    mediaType = "application/json",
                    schema = @Schema(implementation = TokenResponse.class)
            )
    )
    @PostMapping("/shipper/login")
    public ResponseEntity<TokenResponse> shipperLogin(@Valid @RequestBody LoginRequest req) {
        return ResponseEntity.ok(authService.loginShipper(req));
    }

    @Operation(summary = "관리자 로그인")
    @ApiResponse(
            responseCode = "200",
            description = "JWT 토큰 반환",
            content = @Content(
                    mediaType = "application/json",
                    schema = @Schema(implementation = TokenResponse.class)
            )
    )
    @PostMapping("/admin/login")
    public ResponseEntity<TokenResponse> adminLogin(@Valid @RequestBody LoginRequest req) {
        return ResponseEntity.ok(authService.loginAdmin(req));
    }

    @Operation(summary = "화주 회원가입")
    @ApiResponse(
            responseCode = "200",
            description = "회원가입 결과 반환",
            content = @Content(
                    mediaType = "application/json",
                    schema = @Schema(implementation = ShipperSignupResponse.class)
            )
    )
    @PostMapping("/shipper/signup")
    public ResponseEntity<ShipperSignupResponse> shipperSignup(@Valid @RequestBody ShipperSignupRequest req) {
        return ResponseEntity.ok(shipperSignupService.signup(req));
    }

    @Operation(summary = "기사 회원가입")
    @ApiResponse(
            responseCode = "200",
            description = "회원가입 결과 반환",
            content = @Content(
                    mediaType = "application/json",
                    schema = @Schema(implementation = DriverSignupResponse.class)
            )
    )
    @PostMapping("/driver/signup")
    public ResponseEntity<DriverSignupResponse> driverSignup(@Valid @RequestBody DriverSignupRequest req) {
        return ResponseEntity.ok(driverSignupService.signup(req));
    }

    @Operation(summary = "로그아웃")
    @ApiResponse(responseCode = "204", description = "로그아웃 완료")
    @PostMapping("/logout")
    public ResponseEntity<Void> logout(@AuthenticationPrincipal UserDetails userDetails) {
        Long userId = SecurityUtils.getUserId(userDetails);
        String role = resolveRole(userDetails);
        authService.logout(userId, role);
        return ResponseEntity.noContent().build();
    }

    @Operation(summary = "토큰 갱신")
    @ApiResponse(
            responseCode = "200",
            description = "새 JWT 토큰 반환",
            content = @Content(
                    mediaType = "application/json",
                    schema = @Schema(implementation = TokenResponse.class)
            )
    )
    @PostMapping("/refresh")
    public ResponseEntity<TokenResponse> refresh(@Valid @RequestBody RefreshTokenRequest body) {
        return ResponseEntity.ok(authService.refreshToken(body.getRefreshToken()));
    }

    @Operation(summary = "현재 사용자 정보 조회")
    @ApiResponse(
            responseCode = "200",
            description = "사용자 정보 반환",
            content = @Content(
                    mediaType = "application/json",
                    schema = @Schema(implementation = MeResponse.class)
            )
    )
    @GetMapping("/me")
    public ResponseEntity<MeResponse> me(@AuthenticationPrincipal UserDetails userDetails) {
        if (userDetails == null) {
            throw new CustomException(ErrorCode.AUTH_UNAUTHORIZED);
        }
        Long userId = Long.parseLong(userDetails.getUsername());

        if (userDetails.getAuthorities().contains(new SimpleGrantedAuthority("ROLE_DRIVER"))) {
            Driver d = driverRepository.findById(userId)
                    .orElseThrow(() -> new CustomException(ErrorCode.AUTH_FORBIDDEN));
            return ResponseEntity.ok(MeResponse.builder()
                    .id(String.valueOf(d.getDriverId()))
                    .role("driver")
                    .email(d.getEmail())
                    .name(d.getName())
                    .phone(d.getPhone())
                    .build());
        }
        if (userDetails.getAuthorities().contains(new SimpleGrantedAuthority("ROLE_SHIPPER"))) {
            Shipper s = shipperRepository.findById(userId)
                    .orElseThrow(() -> new CustomException(ErrorCode.AUTH_FORBIDDEN));
            return ResponseEntity.ok(MeResponse.builder()
                    .id(String.valueOf(s.getShipperId()))
                    .role("shipper")
                    .email(s.getEmail())
                    .name(s.getName())
                    .phone(s.getPhone())
                    .build());
        }
        if (SecurityUtils.isAdmin(userDetails)) {
            Admin a = adminRepository.findById(userId)
                    .orElseThrow(() -> new CustomException(ErrorCode.AUTH_FORBIDDEN));
            return ResponseEntity.ok(MeResponse.builder()
                    .id(String.valueOf(a.getAdminId()))
                    .role("admin")
                    .email(a.getEmail())
                    .name(a.getName())
                    .phone(a.getPhone())
                    .build());
        }

        throw new CustomException(ErrorCode.AUTH_FORBIDDEN);
    }

    @Operation(summary = "현재 사용자 정보 수정")
    @ApiResponse(
            responseCode = "200",
            description = "수정된 사용자 정보 반환",
            content = @Content(
                    mediaType = "application/json",
                    schema = @Schema(implementation = MeResponse.class)
            )
    )
    @PatchMapping("/me")
    @Transactional
    public ResponseEntity<MeResponse> updateMe(
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestBody MeUpdateRequest request
    ) {
        if (userDetails == null) {
            throw new CustomException(ErrorCode.AUTH_UNAUTHORIZED);
        }

        Long userId = Long.parseLong(userDetails.getUsername());
        String nextName = normalizeText(request == null ? null : request.getName());
        String nextEmail = normalizeText(request == null ? null : request.getEmail());
        String nextPhone = normalizeText(request == null ? null : request.getPhone());

        if (userDetails.getAuthorities().contains(new SimpleGrantedAuthority("ROLE_DRIVER"))) {
            Driver driver = driverRepository.findById(userId)
                    .orElseThrow(() -> new CustomException(ErrorCode.AUTH_FORBIDDEN));
            driver.updateProfile(nextName, nextEmail, nextPhone);
            driverRepository.save(driver);
            return ResponseEntity.ok(MeResponse.builder()
                    .id(String.valueOf(driver.getDriverId()))
                    .role("driver")
                    .email(driver.getEmail())
                    .name(driver.getName())
                    .phone(driver.getPhone())
                    .build());
        }

        if (userDetails.getAuthorities().contains(new SimpleGrantedAuthority("ROLE_SHIPPER"))) {
            Shipper shipper = shipperRepository.findById(userId)
                    .orElseThrow(() -> new CustomException(ErrorCode.AUTH_FORBIDDEN));
            shipper.updateProfile(nextName, nextEmail, nextPhone);
            shipperRepository.save(shipper);
            return ResponseEntity.ok(MeResponse.builder()
                    .id(String.valueOf(shipper.getShipperId()))
                    .role("shipper")
                    .email(shipper.getEmail())
                    .name(shipper.getName())
                    .phone(shipper.getPhone())
                    .build());
        }

        if (SecurityUtils.isAdmin(userDetails)) {
            Admin admin = adminRepository.findById(userId)
                    .orElseThrow(() -> new CustomException(ErrorCode.AUTH_FORBIDDEN));
            admin.updateProfile(nextName, nextEmail, nextPhone);
            adminRepository.save(admin);
            return ResponseEntity.ok(MeResponse.builder()
                    .id(String.valueOf(admin.getAdminId()))
                    .role("admin")
                    .email(admin.getEmail())
                    .name(admin.getName())
                    .phone(admin.getPhone())
                    .build());
        }

        throw new CustomException(ErrorCode.AUTH_FORBIDDEN);
    }

    private static String normalizeText(String value) {
        if (value == null) return null;
        String text = value.trim();
        return text.isEmpty() ? null : text;
    }

    private static String resolveRole(UserDetails userDetails) {
        if (SecurityUtils.hasAuthority(userDetails, "ROLE_DRIVER")) {
            return "DRIVER";
        }
        if (SecurityUtils.hasAuthority(userDetails, "ROLE_SHIPPER")) {
            return "SHIPPER";
        }
        if (SecurityUtils.isAdmin(userDetails)) {
            return "ADMIN";
        }
        throw new CustomException(ErrorCode.AUTH_FORBIDDEN);
    }
}
