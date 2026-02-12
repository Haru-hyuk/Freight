package com.freight.backend.dto.driver;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class DriverSignupRequest {
    private String email;
    private String password;
    private String name;
    private String phone;
    private String address;
    private String addressDetail;
    private String bankName;
    private String bankAccount;
}
