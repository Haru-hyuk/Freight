package com.freight.backend.odcloud;

import com.fasterxml.jackson.annotation.JsonProperty;
import java.util.List;
import lombok.AllArgsConstructor;
import lombok.Getter;

@Getter
@AllArgsConstructor
public class OdcloudValidateRequest {

    @JsonProperty("businesses")
    private List<Business> businesses;

    @Getter
    @AllArgsConstructor
    public static class Business {
        @JsonProperty("b_no")
        private String businessNumber;

        @JsonProperty("start_dt")
        private String startDate;

        @JsonProperty("p_nm")
        private String ownerName;

        @JsonProperty("p_nm2")
        private String ownerName2;

        @JsonProperty("b_nm")
        private String businessName;

        @JsonProperty("corp_no")
        private String corporateNumber;

        @JsonProperty("b_sector")
        private String sector;

        @JsonProperty("b_type")
        private String type;

        @JsonProperty("b_adr")
        private String address;
    }
}
