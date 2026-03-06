package com.freight.backend.exception;

import com.freight.backend.config.RequestIdFilter;
import com.freight.backend.dto.common.ErrorResponse;
import io.jsonwebtoken.ExpiredJwtException;
import io.jsonwebtoken.JwtException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.ConstraintViolation;
import jakarta.validation.ConstraintViolationException;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.stream.Collectors;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.validation.FieldError;
import org.springframework.web.HttpMediaTypeNotSupportedException;
import org.springframework.web.HttpRequestMethodNotSupportedException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.MissingServletRequestParameterException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.springframework.web.servlet.resource.NoResourceFoundException;

@RestControllerAdvice
@Slf4j
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

        String msg = normalizeMessage(
                e.getBindingResult().getFieldError() == null
                        ? null
                        : e.getBindingResult().getFieldError().getDefaultMessage(),
                "입력값을 확인해 주세요."
        );
        return buildResponse(
                HttpStatus.BAD_REQUEST,
                ErrorCode.INVALID_INPUT_VALUE.name(),
                msg,
                request,
                fieldErrors
        );
    }

    @ExceptionHandler(ConstraintViolationException.class)
    public ResponseEntity<ErrorResponse> handleConstraintViolationException(
            ConstraintViolationException e,
            HttpServletRequest request
    ) {
        List<ErrorResponse.FieldErrorItem> fieldErrors = e.getConstraintViolations()
                .stream()
                .map(this::toFieldErrorItem)
                .collect(Collectors.toList());

        return buildResponse(
                HttpStatus.BAD_REQUEST,
                ErrorCode.INVALID_INPUT_VALUE.name(),
                "요청 파라미터를 확인해 주세요.",
                request,
                fieldErrors
        );
    }

    @ExceptionHandler(MethodArgumentTypeMismatchException.class)
    public ResponseEntity<ErrorResponse> handleMethodArgumentTypeMismatchException(
            MethodArgumentTypeMismatchException e,
            HttpServletRequest request
    ) {
        String field = e.getName() == null ? "parameter" : e.getName();
        String requiredType = e.getRequiredType() == null ? "요청 타입" : e.getRequiredType().getSimpleName();
        return buildResponse(
                HttpStatus.BAD_REQUEST,
                ErrorCode.INVALID_INPUT_VALUE.name(),
                String.format("'%s' 값의 형식이 올바르지 않습니다. (%s)", field, requiredType),
                request,
                List.of(ErrorResponse.FieldErrorItem.builder()
                        .field(field)
                        .message("요청 타입이 올바르지 않습니다.")
                        .build())
        );
    }

    @ExceptionHandler(MissingServletRequestParameterException.class)
    public ResponseEntity<ErrorResponse> handleMissingServletRequestParameterException(
            MissingServletRequestParameterException e,
            HttpServletRequest request
    ) {
        return buildResponse(
                HttpStatus.BAD_REQUEST,
                ErrorCode.INVALID_INPUT_VALUE.name(),
                String.format("필수 파라미터 '%s'가 누락되었습니다.", e.getParameterName()),
                request,
                List.of(ErrorResponse.FieldErrorItem.builder()
                        .field(e.getParameterName())
                        .message("필수 파라미터입니다.")
                        .build())
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
                "요청 본문(JSON) 형식이 올바르지 않습니다.",
                request
        );
    }

    @ExceptionHandler(DataIntegrityViolationException.class)
    public ResponseEntity<ErrorResponse> handleDataIntegrity(Exception e, HttpServletRequest request) {
        return buildResponse(
                HttpStatus.BAD_REQUEST,
                ErrorCode.INVALID_REQUEST.name(),
                "요청 데이터 제약조건을 만족하지 않습니다.",
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

    @ExceptionHandler(HttpRequestMethodNotSupportedException.class)
    public ResponseEntity<ErrorResponse> handleHttpRequestMethodNotSupportedException(
            HttpRequestMethodNotSupportedException e,
            HttpServletRequest request
    ) {
        return buildResponse(
                HttpStatus.METHOD_NOT_ALLOWED,
                ErrorCode.INVALID_REQUEST.name(),
                "지원하지 않는 HTTP 메서드입니다.",
                request
        );
    }

    @ExceptionHandler(HttpMediaTypeNotSupportedException.class)
    public ResponseEntity<ErrorResponse> handleHttpMediaTypeNotSupportedException(
            HttpMediaTypeNotSupportedException e,
            HttpServletRequest request
    ) {
        return buildResponse(
                HttpStatus.UNSUPPORTED_MEDIA_TYPE,
                ErrorCode.INVALID_REQUEST.name(),
                "지원하지 않는 Content-Type 입니다.",
                request
        );
    }

    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<ErrorResponse> handleAccessDeniedException(
            AccessDeniedException e,
            HttpServletRequest request
    ) {
        return buildResponse(
                ErrorCode.AUTH_FORBIDDEN.getStatus(),
                ErrorCode.AUTH_FORBIDDEN.name(),
                ErrorCode.AUTH_FORBIDDEN.getMessage(),
                request
        );
    }

    @ExceptionHandler(NoResourceFoundException.class)
    public ResponseEntity<ErrorResponse> handleNoResourceFound(
            NoResourceFoundException e,
            HttpServletRequest request
    ) {
        return buildResponse(
                HttpStatus.NOT_FOUND,
                ErrorCode.INVALID_REQUEST.name(),
                "요청하신 리소스를 찾을 수 없습니다.",
                request
        );
    }

    /* =========================
       RuntimeException (fallback)
       ========================= */
    @ExceptionHandler(RuntimeException.class)
    public ResponseEntity<ErrorResponse> handleRuntimeException(RuntimeException e, HttpServletRequest request) {
        log.error("Unhandled runtime exception. requestId={}, path={}",
                resolveRequestId(request),
                request == null ? null : request.getRequestURI(),
                e
        );
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
        log.error("Unhandled exception. requestId={}, path={}",
                resolveRequestId(request),
                request == null ? null : request.getRequestURI(),
                e
        );
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

    private ErrorResponse.FieldErrorItem toFieldErrorItem(ConstraintViolation<?> constraintViolation) {
        String field = constraintViolation.getPropertyPath() == null
                ? "parameter"
                : constraintViolation.getPropertyPath().toString();
        String message = normalizeMessage(constraintViolation.getMessage(), "요청 파라미터를 확인해 주세요.");
        return ErrorResponse.FieldErrorItem.builder()
                .field(field)
                .message(message)
                .build();
    }

    private String normalizeMessage(String candidate, String fallback) {
        if (candidate == null || candidate.isBlank()) {
            return fallback;
        }
        return candidate.trim();
    }
}
