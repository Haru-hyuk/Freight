package com.freight.backend.controller;

import com.freight.backend.dto.auth.LoginRequest;
import com.freight.backend.dto.auth.TokenResponse;
import com.freight.backend.dto.driver.DriverSignupRequest;
import com.freight.backend.dto.driver.DriverSignupResponse;
import com.freight.backend.dto.shipper.ShipperSignupRequest;
import com.freight.backend.dto.shipper.ShipperSignupResponse;
import com.freight.backend.service.AuthService;
import com.freight.backend.service.DriverSignupService;
import com.freight.backend.service.ShipperSignupService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
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

    @PostMapping("/driver/login")
    public ResponseEntity<TokenResponse> driverLogin(@RequestBody LoginRequest req) {
        return ResponseEntity.ok(authService.loginDriver(req));
    }

    @PostMapping("/shipper/login")
    public ResponseEntity<TokenResponse> shipperLogin(@RequestBody LoginRequest req) {
        return ResponseEntity.ok(authService.loginShipper(req));
    }

    @PostMapping("/admin/login")
    public ResponseEntity<TokenResponse> adminLogin(@RequestBody LoginRequest req) {
        return ResponseEntity.ok(authService.loginAdmin(req));
    }

    @PostMapping("/shipper/signup")
    public ResponseEntity<ShipperSignupResponse> shipperSignup(@RequestBody ShipperSignupRequest req) {
        return ResponseEntity.ok(shipperSignupService.signup(req));
    }

    @PostMapping("/driver/signup")
    public ResponseEntity<DriverSignupResponse> driverSignup(@RequestBody DriverSignupRequest req) {
        return ResponseEntity.ok(driverSignupService.signup(req));
    }

    @PostMapping("/logout")
    public ResponseEntity<Void> logout() {
        return ResponseEntity.noContent().build();
    }
}
