package com.freight.backend.dto.shipper;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class ShipperSignupRequest {
    private String email;
    private String password;
    private String name;
    private String companyName;
    private String phone;
    private String address;
    private String addressDetail;
    private String bizRegNo;
    private String bizPhone;
    private String openDate; // yyyyMMdd
    private String ownerName;
}
