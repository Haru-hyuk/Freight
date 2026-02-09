package com.freight.backend.service;

import com.freight.backend.config.jwt.JwtTokenProvider;
import com.freight.backend.dto.auth.LoginRequest;
import com.freight.backend.dto.auth.TokenResponse;
import com.freight.backend.entity.User;
import com.freight.backend.exception.CustomException;
import com.freight.backend.exception.ErrorCode;
import com.freight.backend.repository.UserRepository;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final JwtTokenProvider jwtTokenProvider;
    private final BCryptPasswordEncoder passwordEncoder;

    @Transactional
    public TokenResponse login(LoginRequest req) {
        User user = userRepository.findByEmail(req.getEmail())
                .orElseThrow(() -> new CustomException(ErrorCode.AUTH_UNAUTHORIZED));

        if (!passwordEncoder.matches(req.getPassword(), user.getPassword())) {
            throw new CustomException(ErrorCode.AUTH_UNAUTHORIZED);
        }

        return issueAccessToken(user);
    }

    private TokenResponse issueAccessToken(User user) {
        String role = "USER";
        String accessToken = jwtTokenProvider.generateAccessToken(
                user.getUserId(),
                user.getEmail(),
                role
        );

        return new TokenResponse(
                accessToken,
                "Bearer",
                jwtTokenProvider.getAccessTokenExpirationSeconds()
        );
    }
}
