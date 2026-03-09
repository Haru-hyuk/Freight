package com.freight.backend.util;

import com.freight.backend.exception.CustomException;
import com.freight.backend.exception.ErrorCode;
import java.util.Collection;
import java.util.Set;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

/**
 * 인증/인가 관련 유틸리티 메서드
 */
public final class SecurityUtils {

    private static final Set<String> ADMIN_AUTHORITIES = Set.of(
            "ROLE_ADMIN",
            "ROLE_SUPER",
            "ROLE_OPERATOR",
            "ROLE_CS"
    );

    private SecurityUtils() {
    }

    /**
     * UserDetails에서 사용자 ID를 Long으로 파싱
     */
    public static Long getUserId(UserDetails userDetails) {
        if (userDetails == null) {
            throw new CustomException(ErrorCode.AUTH_UNAUTHORIZED);
        }
        try {
            return Long.parseLong(userDetails.getUsername());
        } catch (NumberFormatException e) {
            throw new CustomException(ErrorCode.AUTH_UNAUTHORIZED);
        }
    }

    /**
     * UserDetails에서 특정 역할을 가진 사용자 ID 추출
     */
    public static Long requireUserId(UserDetails userDetails, String role) {
        if (userDetails == null) {
            throw new CustomException(ErrorCode.AUTH_UNAUTHORIZED);
        }
        if (!hasAuthority(userDetails, role)) {
            throw new CustomException(ErrorCode.AUTH_FORBIDDEN);
        }
        try {
            return Long.parseLong(userDetails.getUsername());
        } catch (NumberFormatException e) {
            throw new CustomException(ErrorCode.AUTH_UNAUTHORIZED);
        }
    }

    /**
     * 화주 ID 추출 (ROLE_SHIPPER 또는 ROLE_ADMIN 필요)
     */
    public static Long requireShipperId(UserDetails userDetails) {
        if (userDetails == null) {
            throw new CustomException(ErrorCode.AUTH_UNAUTHORIZED);
        }
        boolean isShipper = hasAuthority(userDetails, "ROLE_SHIPPER");
        boolean isAdmin = isAdmin(userDetails);
        if (!isShipper && !isAdmin) {
            throw new CustomException(ErrorCode.AUTH_FORBIDDEN);
        }
        try {
            return Long.parseLong(userDetails.getUsername());
        } catch (NumberFormatException e) {
            throw new CustomException(ErrorCode.AUTH_UNAUTHORIZED);
        }
    }

    /**
     * 기사 ID 추출 (ROLE_DRIVER 또는 ROLE_ADMIN 필요)
     */
    public static Long requireDriverId(UserDetails userDetails) {
        if (userDetails == null) {
            throw new CustomException(ErrorCode.AUTH_UNAUTHORIZED);
        }
        boolean isDriver = hasAuthority(userDetails, "ROLE_DRIVER");
        boolean isAdmin = isAdmin(userDetails);
        if (!isDriver && !isAdmin) {
            throw new CustomException(ErrorCode.AUTH_FORBIDDEN);
        }
        try {
            return Long.parseLong(userDetails.getUsername());
        } catch (NumberFormatException e) {
            throw new CustomException(ErrorCode.AUTH_UNAUTHORIZED);
        }
    }

    /**
     * 관리자 ID 추출 (ROLE_ADMIN 필요)
     */
    public static Long requireAdminId(UserDetails userDetails) {
        if (userDetails == null || !isAdmin(userDetails)) {
            throw new CustomException(ErrorCode.AUTH_FORBIDDEN);
        }
        return getUserId(userDetails);
    }

    public static boolean isAdmin(UserDetails userDetails) {
        return hasAnyAuthority(userDetails, ADMIN_AUTHORITIES);
    }

    public static boolean hasAuthority(UserDetails userDetails, String authority) {
        if (userDetails == null || authority == null || authority.isBlank()) {
            return false;
        }
        return userDetails.getAuthorities().contains(new SimpleGrantedAuthority(authority));
    }

    public static boolean hasAnyAuthority(UserDetails userDetails, Collection<String> authorities) {
        if (userDetails == null || authorities == null || authorities.isEmpty()) {
            return false;
        }
        Set<String> authoritySet = userDetails.getAuthorities().stream()
                .map(GrantedAuthority::getAuthority)
                .collect(java.util.stream.Collectors.toSet());
        return authorities.stream().anyMatch(authoritySet::contains);
    }
}
