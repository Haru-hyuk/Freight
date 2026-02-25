package com.freight.backend.config.jwt;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.freight.backend.dto.common.ErrorResponse;
import com.freight.backend.exception.ErrorCode;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.web.AuthenticationEntryPoint;
import org.springframework.stereotype.Component;

import java.io.IOException;

@Component
public class JwtAuthenticationEntryPoint implements AuthenticationEntryPoint {

    @Override
    public void commence(HttpServletRequest request,
                         HttpServletResponse response,
                         AuthenticationException authException) throws IOException {
        ObjectMapper objectMapper = new ObjectMapper();
        ErrorResponse body = ErrorResponse.builder()
                .success(false)
                .code(ErrorCode.AUTH_UNAUTHORIZED.name())
                .status(HttpServletResponse.SC_UNAUTHORIZED)
                .message("Authentication required.")
                .path(request.getRequestURI())
                .timestamp(LocalDateTime.now().format(DateTimeFormatter.ISO_LOCAL_DATE_TIME))
                .build();

        response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
        response.setContentType("application/json");
        response.setCharacterEncoding("UTF-8");
        response.getWriter().write(objectMapper.writeValueAsString(body));
    }
}
