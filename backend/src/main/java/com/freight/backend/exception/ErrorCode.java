package com.freight.backend.exception;

import org.springframework.http.HttpStatus;

public enum ErrorCode {

    /* =========================
       AUTH / SECURITY
       ========================= */
    AUTH_INVALID_TOKEN(HttpStatus.UNAUTHORIZED, "Invalid token."),
    AUTH_EXPIRED_TOKEN(HttpStatus.UNAUTHORIZED, "Token expired."),
    AUTH_UNAUTHORIZED(HttpStatus.UNAUTHORIZED, "Authentication required."),
    AUTH_FORBIDDEN(HttpStatus.FORBIDDEN, "Access denied."),

    /* =========================
       REQUEST / VALIDATION
       ========================= */
    INVALID_REQUEST(HttpStatus.BAD_REQUEST, "Invalid request."),
    INVALID_INPUT_VALUE(HttpStatus.BAD_REQUEST, "Invalid input value."),
    DUPLICATE_EMAIL(HttpStatus.CONFLICT, "이미 사용 중인 이메일입니다."),
    INVALID_BUSINESS_INFO(HttpStatus.BAD_REQUEST, "사업자 정보가 유효하지 않습니다."),

    /* =========================
       MATCHING
       ========================= */
    MATCH_NOT_FOUND(HttpStatus.NOT_FOUND, "매칭을 찾을 수 없습니다."),
    MATCH_ALREADY_ACCEPTED(HttpStatus.CONFLICT, "이미 수락된 매칭입니다."),
    MATCH_ALREADY_EXISTS(HttpStatus.CONFLICT, "해당 견적에 이미 매칭이 존재합니다."),
    QUOTE_NOT_OPEN(HttpStatus.BAD_REQUEST, "견적이 공개 상태가 아닙니다."),

    /* =========================
       EXTERNAL API
       ========================= */
    EXTERNAL_API_ERROR(HttpStatus.SERVICE_UNAVAILABLE, "외부 서비스 연결에 실패했습니다."),

    /* =========================
       COMMON
       ========================= */
    INTERNAL_ERROR(HttpStatus.INTERNAL_SERVER_ERROR, "Internal server error.");

    private final HttpStatus status;
    private final String message;

    ErrorCode(HttpStatus status, String message) {
        this.status = status;
        this.message = message;
    }

    public HttpStatus getStatus() {
        return status;
    }

    public String getMessage() {
        return message;
    }
}
