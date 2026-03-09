package com.freight.backend.exception;

import org.springframework.http.HttpStatus;

public enum ErrorCode {

    /* =========================
       AUTH / SECURITY
       ========================= */
    AUTH_INVALID_TOKEN(HttpStatus.UNAUTHORIZED, "유효하지 않은 인증 토큰입니다."),
    AUTH_EXPIRED_TOKEN(HttpStatus.UNAUTHORIZED, "인증 토큰이 만료되었습니다."),
    AUTH_UNAUTHORIZED(HttpStatus.UNAUTHORIZED, "로그인이 필요합니다."),
    AUTH_FORBIDDEN(HttpStatus.FORBIDDEN, "해당 작업에 대한 권한이 없습니다."),

    /* =========================
       REQUEST / VALIDATION
       ========================= */
    INVALID_REQUEST(HttpStatus.BAD_REQUEST, "요청 형식이 올바르지 않습니다."),
    INVALID_INPUT_VALUE(HttpStatus.BAD_REQUEST, "입력값이 올바르지 않습니다."),
    DUPLICATE_EMAIL(HttpStatus.CONFLICT, "이미 사용 중인 이메일입니다."),
    INVALID_BUSINESS_INFO(HttpStatus.BAD_REQUEST, "사업자 정보가 올바르지 않습니다."),
    DRIVER_TRUCK_REQUIRED(HttpStatus.BAD_REQUEST, "노선/적재 최적화를 위해 승인된 내 트럭이 필요합니다."),

    /* =========================
       MATCHING
       ========================= */
    MATCH_NOT_FOUND(HttpStatus.NOT_FOUND, "매칭 정보를 찾을 수 없습니다."),
    MATCH_ALREADY_ACCEPTED(HttpStatus.CONFLICT, "이미 수락된 매칭입니다."),
    MATCH_ALREADY_EXISTS(HttpStatus.CONFLICT, "해당 견적에 대한 매칭이 이미 존재합니다."),
    MATCH_PAYMENT_REQUIRED(HttpStatus.BAD_REQUEST, "운송 시작 전 결제가 완료되어야 합니다."),
    MATCH_CANCEL_NOT_ALLOWED_AFTER_PAYMENT(HttpStatus.BAD_REQUEST, "결제가 완료된 매칭은 취소할 수 없습니다."),
    QUOTE_NOT_OPEN(HttpStatus.BAD_REQUEST, "현재 상태에서는 해당 견적을 처리할 수 없습니다."),

    /* =========================
       EXTERNAL API
       ========================= */
    EXTERNAL_API_ERROR(HttpStatus.SERVICE_UNAVAILABLE, "외부 연동 서비스 호출에 실패했습니다."),
    ORIGIN_GEOCODE_FAILED(HttpStatus.UNPROCESSABLE_CONTENT, "출발지 좌표 변환에 실패했습니다."),
    DESTINATION_GEOCODE_FAILED(HttpStatus.UNPROCESSABLE_CONTENT, "도착지 좌표 변환에 실패했습니다."),
    STOP_GEOCODE_FAILED(HttpStatus.UNPROCESSABLE_CONTENT, "경유지 좌표 변환에 실패했습니다."),
    ROUTE_DISTANCE_FAILED(HttpStatus.UNPROCESSABLE_CONTENT, "노선 거리 계산에 실패했습니다."),

    /* =========================
       USER
       ========================= */
    USER_NOT_FOUND(HttpStatus.NOT_FOUND, "사용자를 찾을 수 없습니다."),

    /* =========================
       COMMON
       ========================= */
    INTERNAL_ERROR(HttpStatus.INTERNAL_SERVER_ERROR, "일시적인 서버 오류가 발생했습니다.");

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
