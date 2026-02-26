package com.freight.backend.config.jwt;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.freight.backend.config.RequestIdFilter;
import com.freight.backend.dto.common.ErrorResponse;
import com.freight.backend.exception.ErrorCode;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.web.access.AccessDeniedHandler;
import org.springframework.stereotype.Component;

import java.io.IOException;

@Component
public class JwtAccessDeniedHandler implements AccessDeniedHandler {

    @Override
    public void handle(HttpServletRequest request,
                       HttpServletResponse response,
                       AccessDeniedException accessDeniedException) throws IOException {
        ObjectMapper objectMapper = new ObjectMapper();
        ErrorResponse body = ErrorResponse.builder()
                .success(false)
                .code(ErrorCode.AUTH_FORBIDDEN.name())
                .status(HttpServletResponse.SC_FORBIDDEN)
                .message("Access denied.")
                .path(request.getRequestURI())
                .timestamp(LocalDateTime.now().format(DateTimeFormatter.ISO_LOCAL_DATE_TIME))
                .requestId(resolveRequestId(request))
                .build();

        response.setStatus(HttpServletResponse.SC_FORBIDDEN);
        response.setContentType("application/json");
        response.setCharacterEncoding("UTF-8");
        response.getWriter().write(objectMapper.writeValueAsString(body));
    }

    private String resolveRequestId(HttpServletRequest request) {
        Object attr = request.getAttribute(RequestIdFilter.REQUEST_ID_ATTR);
        if (attr instanceof String requestId && !requestId.isBlank()) {
            return requestId;
        }
        String header = request.getHeader(RequestIdFilter.REQUEST_ID_HEADER);
        return (header == null || header.isBlank()) ? null : header;
    }
}
