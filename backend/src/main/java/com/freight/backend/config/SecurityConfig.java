package com.freight.backend.config;

import com.freight.backend.config.jwt.JwtAccessDeniedHandler;
import com.freight.backend.config.jwt.JwtAuthenticationEntryPoint;
import com.freight.backend.config.jwt.JwtAuthenticationFilter;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.core.env.Environment;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.Arrays;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@Configuration
@EnableWebSecurity
@EnableMethodSecurity(prePostEnabled = true)
@RequiredArgsConstructor
public class SecurityConfig {
    private static final Logger log = LoggerFactory.getLogger(SecurityConfig.class);

    private final JwtAuthenticationFilter jwtAuthenticationFilter;
    private final JwtAuthenticationEntryPoint jwtAuthenticationEntryPoint;
    private final JwtAccessDeniedHandler jwtAccessDeniedHandler;
    private final Environment environment;

    @Value("${cors.allowed-origins:http://localhost:3000,http://localhost:5173,http://localhost:8081,http://localhost:8082,http://localhost:8083,http://localhost:19006,http://127.0.0.1:3000,http://127.0.0.1:5173,http://127.0.0.1:8081,http://127.0.0.1:8082,http://127.0.0.1:8083,http://127.0.0.1:19006,https://localhost:3000,https://localhost:5173,https://localhost:8081,https://localhost:8082,https://localhost:8083,https://localhost:19006,https://127.0.0.1:3000,https://127.0.0.1:5173,https://127.0.0.1:8081,https://127.0.0.1:8082,https://127.0.0.1:8083,https://127.0.0.1:19006}")
    private String allowedOrigins;

    @Value("${app.security.require-https:false}")
    private boolean requireHttps;

    @Value("${cors.allow-wildcard:false}")
    private boolean allowWildcardOrigins;

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {

        http
                .csrf(csrf -> csrf.disable())
                .cors(cors -> cors.configurationSource(corsConfigurationSource()))
                .formLogin(form -> form.disable())
                .httpBasic(basic -> basic.disable())
                .sessionManagement(session ->
                        session.sessionCreationPolicy(SessionCreationPolicy.STATELESS)
                )
                .exceptionHandling(ex -> ex
                        .authenticationEntryPoint(jwtAuthenticationEntryPoint)
                        .accessDeniedHandler(jwtAccessDeniedHandler)
                )
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers(
                                "/api/auth/driver/login",
                                "/api/auth/driver/signup",
                                "/api/auth/shipper/login",
                                "/api/auth/admin/login",
                                "/api/auth/shipper/signup",
                                "/api/auth/refresh",
                                "/swagger-ui/**",
                                "/swagger-ui.html",
                                "/api-docs/**",
                                "/v3/api-docs/**",
                                "/actuator/health",
                                "/actuator/info",
                                "/api/config/public",
                                "/api/route/health",
                                "/api/route-assembly/health"
                        ).permitAll()
                        .requestMatchers("/api/route/place-search").hasAnyRole("DRIVER", "SHIPPER", "ADMIN", "SUPER", "OPERATOR", "CS")
                        .requestMatchers("/api/route-assembly/calibration/**").hasAnyRole("ADMIN", "SUPER", "OPERATOR", "CS")
                        .requestMatchers("/api/route/**").hasAnyRole("DRIVER", "SHIPPER", "ADMIN", "SUPER", "OPERATOR", "CS")
                        .requestMatchers("/api/reference/**").hasAnyRole("DRIVER", "SHIPPER", "ADMIN", "SUPER", "OPERATOR", "CS")
                        .requestMatchers("/api/load/**").hasAnyRole("DRIVER", "ADMIN", "SUPER", "OPERATOR", "CS")
                        .requestMatchers("/api/route-assembly/**").hasAnyRole("DRIVER", "SHIPPER", "ADMIN", "SUPER", "OPERATOR", "CS")
                        .requestMatchers("/api/admin/**").hasAnyRole("ADMIN", "SUPER", "OPERATOR", "CS")
                        .requestMatchers("/api/driver/**").hasAnyRole("DRIVER", "ADMIN")
                        .requestMatchers("/api/shipper/**").hasAnyRole("SHIPPER", "ADMIN")
                        .requestMatchers("/api/**").authenticated()
                        .anyRequest().permitAll()
                );

        if (requireHttps) {
            // Spring Security 7에서는 requiresChannel 대신 redirectToHttps를 사용한다.
            http.redirectToHttps(Customizer.withDefaults());
        }

        http.addFilterBefore(
                jwtAuthenticationFilter,
                UsernamePasswordAuthenticationFilter.class
        );

        return http.build();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration config = new CorsConfiguration();

        config.setAllowCredentials(true);
        boolean prodProfile = isProdProfileActive();

        // Parse allowed origins from configuration
        List<String> origins = new ArrayList<>(Arrays.stream(allowedOrigins.split(","))
                .map(String::trim)
                .filter(origin -> !origin.isBlank())
                .collect(Collectors.toList()));
        if (origins.contains("*")) {
            if (allowWildcardOrigins) {
                if (prodProfile) {
                    throw new IllegalStateException("CORS wildcard('*') is forbidden in prod profile");
                }
                config.setAllowedOriginPatterns(List.of("*"));
                log.warn("CORS wildcard origin is enabled. 운영 환경에서는 사용하지 마세요.");
            } else {
                origins.removeIf("*"::equals);
                log.warn("CORS wildcard origin '*' is ignored because cors.allow-wildcard=false");
                if (origins.isEmpty()) {
                    if (prodProfile) {
                        throw new IllegalStateException("cors.allowed-origins must be an explicit whitelist in prod profile");
                    }
                    origins = List.of(
                            "http://localhost:3000",
                            "http://localhost:5173",
                            "http://localhost:8081",
                            "http://localhost:19006",
                            "https://localhost:3000",
                            "https://localhost:5173",
                            "https://localhost:8081",
                            "https://localhost:19006"
                    );
                }
                config.setAllowedOrigins(origins);
            }
        } else {
            if (prodProfile && origins.isEmpty()) {
                throw new IllegalStateException("cors.allowed-origins must not be empty in prod profile");
            }
            config.setAllowedOrigins(origins);
        }

        config.setAllowedMethods(Arrays.asList(
                "GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"
        ));
        config.setAllowedHeaders(Arrays.asList(
                "Authorization", "Content-Type", "X-Requested-With", "Accept", "Origin"
        ));
        config.setExposedHeaders(Arrays.asList("Authorization"));
        config.setMaxAge(3600L);

        UrlBasedCorsConfigurationSource source =
                new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", config);

        return source;
    }

    private boolean isProdProfileActive() {
        return Arrays.stream(environment.getActiveProfiles())
                .anyMatch(profile -> "prod".equalsIgnoreCase(profile));
    }
}
