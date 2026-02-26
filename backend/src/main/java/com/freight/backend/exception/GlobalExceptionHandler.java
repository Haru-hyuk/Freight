package com.freight.backend.exception;

import com.freight.backend.config.RequestIdFilter;
import com.freight.backend.dto.common.ErrorResponse;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.ConstraintViolationException;
import io.jsonwebtoken.ExpiredJwtException;
import io.jsonwebtoken.JwtException;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.stream.Collectors;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice
public class GlobalExceptionHandler {

    /* =========================
       CustomException
       ========================= */
    @ExceptionHandler(CustomException.class)
    public ResponseEntity<ErrorResponse> handleCustomException(CustomException e, HttpServletRequest request) {
        ErrorCode code = e.getErrorCode();
        return buildResponse(code.getStatus(), code.name(), code.getMessage(), request);
    }

    /* =========================
       JWT invalid/expired
       ========================= */
    @ExceptionHandler({ExpiredJwtException.class, JwtException.class})
    public ResponseEntity<ErrorResponse> handleJwtException(Exception e, HttpServletRequest request) {
        return buildResponse(
                ErrorCode.AUTH_INVALID_TOKEN.getStatus(),
                ErrorCode.AUTH_INVALID_TOKEN.name(),
                ErrorCode.AUTH_INVALID_TOKEN.getMessage(),
                request
        );
    }
    /* =========================
       Validation errors
       ========================= */
    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ErrorResponse> handleValidation(MethodArgumentNotValidException e, HttpServletRequest request) {
        List<ErrorResponse.FieldErrorItem> fieldErrors = e.getBindingResult()
                .getFieldErrors()
                .stream()
                .map(this::toFieldErrorItem)
                .collect(Collectors.toList());

        String msg = e.getBindingResult().getFieldError() == null
                ? "Validation failed."
                : e.getBindingResult().getFieldError().getDefaultMessage();
        return buildResponse(
                HttpStatus.BAD_REQUEST,
                ErrorCode.INVALID_INPUT_VALUE.name(),
                msg,
                request,
                fieldErrors
        );
    }
    /* =========================
       JSON parse errors
       ========================= */
    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ResponseEntity<ErrorResponse> handleHttpMessageNotReadable(
            HttpMessageNotReadableException e,
            HttpServletRequest request
    ) {
        return buildResponse(
                HttpStatus.BAD_REQUEST,
                ErrorCode.INVALID_REQUEST.name(),
                "Invalid JSON payload.",
                request
        );
    }

    @ExceptionHandler({DataIntegrityViolationException.class, ConstraintViolationException.class})
    public ResponseEntity<ErrorResponse> handleDataIntegrity(Exception e, HttpServletRequest request) {
        return buildResponse(
                HttpStatus.BAD_REQUEST,
                ErrorCode.INVALID_REQUEST.name(),
                "Invalid request data.",
                request
        );
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<ErrorResponse> handleIllegalArgumentException(
            IllegalArgumentException e,
            HttpServletRequest request
    ) {
        String message = (e.getMessage() == null || e.getMessage().isBlank())
                ? ErrorCode.INVALID_INPUT_VALUE.getMessage()
                : e.getMessage();
        return buildResponse(
                HttpStatus.BAD_REQUEST,
                ErrorCode.INVALID_INPUT_VALUE.name(),
                message,
                request
        );
    }
    /* =========================
       RuntimeException (fallback)
       ========================= */
    @ExceptionHandler(RuntimeException.class)
    public ResponseEntity<ErrorResponse> handleRuntimeException(RuntimeException e, HttpServletRequest request) {
        return buildResponse(
                ErrorCode.INTERNAL_ERROR.getStatus(),
                ErrorCode.INTERNAL_ERROR.name(),
                ErrorCode.INTERNAL_ERROR.getMessage(),
                request
        );
    }
    /* =========================
       All other exceptions
       ========================= */
    @ExceptionHandler(Exception.class)
    public ResponseEntity<ErrorResponse> handleException(Exception e, HttpServletRequest request) {
        return buildResponse(
                HttpStatus.INTERNAL_SERVER_ERROR,
                ErrorCode.INTERNAL_ERROR.name(),
                ErrorCode.INTERNAL_ERROR.getMessage(),
                request
        );
    }
    /* =========================
       Shared response builder
       ========================= */
    private ResponseEntity<ErrorResponse> buildResponse(
            HttpStatus status,
            String code,
            String message,
            HttpServletRequest request
    ) {
        return buildResponse(status, code, message, request, null);
    }

    private ResponseEntity<ErrorResponse> buildResponse(
            HttpStatus status,
            String code,
            String message,
            HttpServletRequest request,
            List<ErrorResponse.FieldErrorItem> fieldErrors
    ) {
        String requestId = resolveRequestId(request);
        return ResponseEntity.status(status)
                .body(
                        ErrorResponse.builder()
                                .success(false)
                                .code(code)
                                .status(status.value())
                                .message(message)
                                .path(request == null ? null : request.getRequestURI())
                                .timestamp(LocalDateTime.now().format(DateTimeFormatter.ISO_LOCAL_DATE_TIME))
                                .requestId(requestId)
                                .fieldErrors(fieldErrors)
                                .build()
                );
    }

    private String resolveRequestId(HttpServletRequest request) {
        if (request == null) {
            return null;
        }
        Object attr = request.getAttribute(RequestIdFilter.REQUEST_ID_ATTR);
        if (attr instanceof String requestId && !requestId.isBlank()) {
            return requestId;
        }
        String header = request.getHeader(RequestIdFilter.REQUEST_ID_HEADER);
        return (header == null || header.isBlank()) ? null : header;
    }

    private ErrorResponse.FieldErrorItem toFieldErrorItem(FieldError fieldError) {
        return ErrorResponse.FieldErrorItem.builder()
                .field(fieldError.getField())
                .message(fieldError.getDefaultMessage())
                .build();
    }
}
