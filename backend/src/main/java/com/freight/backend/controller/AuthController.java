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
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;
    private final DriverSignupService driverSignupService;
    private final ShipperSignupService shipperSignupService;
    private final DriverRepository driverRepository;
    private final ShipperRepository shipperRepository;
    private final AdminRepository adminRepository;

    @PostMapping("/driver/login")
    public ResponseEntity<TokenResponse> driverLogin(@Valid @RequestBody LoginRequest req) {
        return ResponseEntity.ok(authService.loginDriver(req));
    }

    @PostMapping("/shipper/login")
    public ResponseEntity<TokenResponse> shipperLogin(@Valid @RequestBody LoginRequest req) {
        return ResponseEntity.ok(authService.loginShipper(req));
    }

    @PostMapping("/admin/login")
    public ResponseEntity<TokenResponse> adminLogin(@Valid @RequestBody LoginRequest req) {
        return ResponseEntity.ok(authService.loginAdmin(req));
    }

    @PostMapping("/shipper/signup")
    public ResponseEntity<ShipperSignupResponse> shipperSignup(@Valid @RequestBody ShipperSignupRequest req) {
        return ResponseEntity.ok(shipperSignupService.signup(req));
    }

    @PostMapping("/driver/signup")
    public ResponseEntity<DriverSignupResponse> driverSignup(@Valid @RequestBody DriverSignupRequest req) {
        return ResponseEntity.ok(driverSignupService.signup(req));
    }

    @PostMapping("/logout")
    public ResponseEntity<Void> logout() {
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/refresh")
    public ResponseEntity<TokenResponse> refresh(@Valid @RequestBody RefreshTokenRequest body) {
        return ResponseEntity.ok(authService.refreshToken(body.getRefreshToken()));
    }

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
        if (userDetails.getAuthorities().contains(new SimpleGrantedAuthority("ROLE_ADMIN"))) {
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

    @PatchMapping("/me")
    public ResponseEntity<MeResponse> patchMe(
            @AuthenticationPrincipal UserDetails userDetails,
            @Valid @RequestBody MeUpdateRequest req
    ) {
        if (userDetails == null) {
            throw new CustomException(ErrorCode.AUTH_UNAUTHORIZED);
        }
        Long userId = Long.parseLong(userDetails.getUsername());
        String role = resolveRole(userDetails);
        return ResponseEntity.ok(authService.updateMe(userId, role, req));
    }

    @PutMapping("/me")
    public ResponseEntity<MeResponse> putMe(
            @AuthenticationPrincipal UserDetails userDetails,
            @Valid @RequestBody MeUpdateRequest req
    ) {
        return patchMe(userDetails, req);
    }

    private String resolveRole(UserDetails userDetails) {
        if (userDetails.getAuthorities().contains(new SimpleGrantedAuthority("ROLE_DRIVER"))) {
            return "driver";
        }
        if (userDetails.getAuthorities().contains(new SimpleGrantedAuthority("ROLE_SHIPPER"))) {
            return "shipper";
        }
        if (userDetails.getAuthorities().contains(new SimpleGrantedAuthority("ROLE_ADMIN"))) {
            return "admin";
        }
        throw new CustomException(ErrorCode.AUTH_FORBIDDEN);
    }
}
