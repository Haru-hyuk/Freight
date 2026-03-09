package com.freight.backend.dto.auth;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class MeUpdateRequest {
    private String name;
    private String email;
    private String phone;
}

