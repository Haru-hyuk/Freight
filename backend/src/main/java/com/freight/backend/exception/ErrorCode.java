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
    DUPLICATE_EMAIL(HttpStatus.CONFLICT, "Email already in use."),
    INVALID_BUSINESS_INFO(HttpStatus.BAD_REQUEST, "Invalid business information."),
    DRIVER_TRUCK_REQUIRED(HttpStatus.BAD_REQUEST, "Truck registration is required for route/load optimization."),

    /* =========================
       MATCHING
       ========================= */
    MATCH_NOT_FOUND(HttpStatus.NOT_FOUND, "Match not found."),
    MATCH_ALREADY_ACCEPTED(HttpStatus.CONFLICT, "Match already accepted."),
    MATCH_ALREADY_EXISTS(HttpStatus.CONFLICT, "Match already exists for this quote."),
    MATCH_PAYMENT_REQUIRED(HttpStatus.BAD_REQUEST, "Payment must be completed before transport can start."),
    QUOTE_NOT_OPEN(HttpStatus.BAD_REQUEST, "Quote is not open."),

    /* =========================
       EXTERNAL API
       ========================= */
    EXTERNAL_API_ERROR(HttpStatus.SERVICE_UNAVAILABLE, "External API call failed."),
    ORIGIN_GEOCODE_FAILED(HttpStatus.UNPROCESSABLE_ENTITY, "Failed to geocode origin address."),
    DESTINATION_GEOCODE_FAILED(HttpStatus.UNPROCESSABLE_ENTITY, "Failed to geocode destination address."),
    STOP_GEOCODE_FAILED(HttpStatus.UNPROCESSABLE_ENTITY, "Failed to geocode stop address."),
    ROUTE_DISTANCE_FAILED(HttpStatus.UNPROCESSABLE_ENTITY, "Failed to calculate route distance."),

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
