package com.freight.backend.controller;

import com.freight.backend.dto.auth.LoginRequest;
import com.freight.backend.dto.auth.TokenResponse;
import com.freight.backend.service.AuthService;
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
}
