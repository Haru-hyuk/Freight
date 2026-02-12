package com.freight.backend.dto.quote;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class QuoteStopRequest {
    private Integer seq;
    private String address;
    private Double lat;
    private Double lng;
    private String contactName;
    private String contactPhone;
    private String deptName;
    private String managerName;
}
