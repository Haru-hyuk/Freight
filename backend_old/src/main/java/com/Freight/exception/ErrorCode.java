package com.Freight.exception;

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
