package com.freight.backend.dto.quote;

import lombok.AllArgsConstructor;
import lombok.Getter;

@Getter
@AllArgsConstructor
public class QuoteStopResponse {
    private Long quoteStopId;
    private Integer seq;
    private String address;
    private Double lat;
    private Double lng;
    private String contactName;
    private String contactPhone;
    private String deptName;
    private String managerName;
}
