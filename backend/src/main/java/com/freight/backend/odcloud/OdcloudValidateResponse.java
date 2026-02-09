package com.freight.backend.odcloud;

import com.fasterxml.jackson.annotation.JsonProperty;
import java.util.List;
import lombok.Getter;

@Getter
public class OdcloudValidateResponse {

    @JsonProperty("status_code")
    private String statusCode;

    @JsonProperty("request_cnt")
    private int requestCount;

    @JsonProperty("valid_cnt")
    private int validCount;

    @JsonProperty("data")
    private List<ValidationData> data;

    @Getter
    public static class ValidationData {
        @JsonProperty("b_no")
        private String businessNumber;

        @JsonProperty("valid")
        private String valid;

        @JsonProperty("valid_msg")
        private String validMessage;
    }
}
