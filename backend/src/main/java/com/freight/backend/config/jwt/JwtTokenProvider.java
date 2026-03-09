package com.freight.backend.config.jwt;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.SignatureAlgorithm;
import io.jsonwebtoken.security.Keys;
import jakarta.annotation.PostConstruct;
import jakarta.servlet.http.HttpServletRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.nio.charset.StandardCharsets;
import java.security.Key;
import java.util.Date;
import java.util.HashMap;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

@Component
public class JwtTokenProvider {

    private static final Logger log = LoggerFactory.getLogger(JwtTokenProvider.class);
    public static final String TOKEN_TYPE_ACCESS = "access";
    public static final String TOKEN_TYPE_REFRESH = "refresh";
    private static final int MIN_SECRET_LENGTH = 32;
    private static final Set<String> WEAK_SECRETS = Set.of(
            "change-this-dev-jwt-secret-at-least-32-bytes-long",
            "your-secret-key",
            "secret",
            "password"
    );

    private final Key key;
    private final long accessTokenExpirationMs;
    private final String secretKey;
    private final long refreshTokenExpirationMs;

    public JwtTokenProvider(
            @Value("${jwt.secret}") String secretKey,
            @Value("${jwt.access-token-expiration-seconds:3600}") long accessExpirationSeconds,
            @Value("${jwt.refresh-token-expiration-seconds:1209600}") long refreshExpirationSeconds
    ) {
        this.secretKey = secretKey;
        this.key = Keys.hmacShaKeyFor(secretKey.getBytes(StandardCharsets.UTF_8));
        this.accessTokenExpirationMs = accessExpirationSeconds * 1000L;
        this.refreshTokenExpirationMs = refreshExpirationSeconds * 1000L;
    }

    @PostConstruct
    public void validateSecretKey() {
        if (secretKey == null || secretKey.isBlank()) {
            throw new IllegalStateException("JWT secret key must be configured via JWT_SECRET environment variable");
        }

        if (secretKey.length() < MIN_SECRET_LENGTH) {
            throw new IllegalStateException(
                    String.format("JWT secret key must be at least %d characters long", MIN_SECRET_LENGTH)
            );
        }

        if (WEAK_SECRETS.stream().anyMatch(weak -> secretKey.toLowerCase().contains(weak.toLowerCase()))) {
            log.warn("WARNING: JWT secret appears to be a default/weak value. Please change it for production!");
        }
    }

    public long getAccessTokenExpirationSeconds() {
        return accessTokenExpirationMs / 1000L;
    }

    public long getRefreshTokenExpirationSeconds() {
        return refreshTokenExpirationMs / 1000L;
    }

    public String resolveToken(HttpServletRequest request) {
        String bearer = request.getHeader("Authorization");
        if (bearer != null && bearer.startsWith("Bearer ")) {
            return bearer.substring(7);
        }
        return null;
    }

    public String generateAccessToken(Long userId, String email, String role) {
        Date now = new Date();
        Map<String, Object> claims = new HashMap<>();
        claims.put("email", email);
        claims.put("role", role);
        claims.put("type", TOKEN_TYPE_ACCESS);

        return Jwts.builder()
                .setClaims(claims)
                .setSubject(String.valueOf(userId))
                .setIssuedAt(now)
                .setExpiration(new Date(now.getTime() + accessTokenExpirationMs))
                .signWith(key, SignatureAlgorithm.HS256)
                .compact();
    }

    public String generateRefreshToken(Long userId, String email, String role) {
        // 하위 호환: JTI 미전달 호출도 내부에서 고유 ID를 발급한다.
        String randomJti = UUID.randomUUID().toString().replace("-", "");
        return generateRefreshToken(userId, email, role, randomJti);
    }

    public String generateRefreshToken(Long userId, String email, String role, String jti) {
        Date now = new Date();
        Map<String, Object> claims = new HashMap<>();
        claims.put("email", email);
        claims.put("role", role);
        claims.put("type", TOKEN_TYPE_REFRESH);

        return Jwts.builder()
                .setClaims(claims)
                .setSubject(String.valueOf(userId))
                .setId(jti)
                .setIssuedAt(now)
                .setExpiration(new Date(now.getTime() + refreshTokenExpirationMs))
                .signWith(key, SignatureAlgorithm.HS256)
                .compact();
    }

    private Claims parseClaims(String token) {
        return Jwts.parserBuilder()
                .setSigningKey(key)
                .build()
                .parseClaimsJws(token)
                .getBody();
    }

    public String getUserIdFromToken(String token) {
        return parseClaims(token).getSubject();
    }

    public String getEmailFromToken(String token) {
        return parseClaims(token).get("email", String.class);
    }

    public String getRoleFromToken(String token) {
        return parseClaims(token).get("role", String.class);
    }

    public String getTokenTypeFromToken(String token) {
        String tokenType = parseClaims(token).get("type", String.class);
        return tokenType == null ? null : tokenType.trim();
    }

    public String getJtiFromToken(String token) {
        return parseClaims(token).getId();
    }

    public Date getIssuedAtFromToken(String token) {
        return parseClaims(token).getIssuedAt();
    }

    public Date getExpirationFromToken(String token) {
        return parseClaims(token).getExpiration();
    }

    public void validateTokenOrThrow(String token) {
        try {
            Jwts.parserBuilder()
                    .setSigningKey(key)
                    .build()
                    .parseClaimsJws(token);
        } catch (JwtException | IllegalArgumentException e) {
            throw e;
        }
    }

    public void validateRefreshTokenOrThrow(String token) {
        validateTokenOrThrow(token);
        if (!isRefreshToken(token)) {
            throw new JwtException("Invalid token type for refresh");
        }
    }

    public void validateAccessTokenOrThrow(String token) {
        validateTokenOrThrow(token);
        String tokenType = getTokenTypeFromToken(token);
        if (TOKEN_TYPE_REFRESH.equalsIgnoreCase(tokenType)) {
            throw new JwtException("Refresh token cannot be used as access token");
        }
        if (tokenType != null && !tokenType.isBlank() && !TOKEN_TYPE_ACCESS.equalsIgnoreCase(tokenType)) {
            throw new JwtException("Unsupported token type");
        }
    }

    public boolean isRefreshToken(String token) {
        String tokenType = getTokenTypeFromToken(token);
        return TOKEN_TYPE_REFRESH.equalsIgnoreCase(tokenType);
    }
}
