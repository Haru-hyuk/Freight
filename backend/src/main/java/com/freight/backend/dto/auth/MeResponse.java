package com.freight.backend.dto.auth;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
@AllArgsConstructor
public class MeResponse {
    private String id;
    private String role;
    private String email;
    private String name;
    private String phone;
}
