package com.freight.backend.util;

import com.freight.backend.exception.CustomException;
import com.freight.backend.exception.ErrorCode;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

/**
 * 인증/인가 관련 유틸리티 메서드
 */
public final class SecurityUtils {

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
        if (!userDetails.getAuthorities().contains(new SimpleGrantedAuthority(role))) {
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
        boolean isShipper = userDetails.getAuthorities().contains(new SimpleGrantedAuthority("ROLE_SHIPPER"));
        boolean isAdmin = userDetails.getAuthorities().contains(new SimpleGrantedAuthority("ROLE_ADMIN"));
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
        boolean isDriver = userDetails.getAuthorities().contains(new SimpleGrantedAuthority("ROLE_DRIVER"));
        boolean isAdmin = userDetails.getAuthorities().contains(new SimpleGrantedAuthority("ROLE_ADMIN"));
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
        return requireUserId(userDetails, "ROLE_ADMIN");
    }
}
