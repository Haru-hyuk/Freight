package com.freight.backend.config;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

@Component
@Order(Ordered.HIGHEST_PRECEDENCE + 10)
public class SecurityHeadersFilter extends OncePerRequestFilter {

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain
    ) throws ServletException, IOException {
        addHeaderIfMissing(response, "X-Content-Type-Options", "nosniff");
        addHeaderIfMissing(response, "X-Frame-Options", "SAMEORIGIN");
        addHeaderIfMissing(response, "Referrer-Policy", "strict-origin-when-cross-origin");
        addHeaderIfMissing(response, "Permissions-Policy", "geolocation=(self), microphone=(), camera=()");

        if (request.isSecure()) {
            addHeaderIfMissing(response, "Strict-Transport-Security", "max-age=31536000; includeSubDomains");
        }

        filterChain.doFilter(request, response);
    }

    private void addHeaderIfMissing(HttpServletResponse response, String headerName, String value) {
        if (!response.containsHeader(headerName)) {
            response.setHeader(headerName, value);
        }
    }
}

