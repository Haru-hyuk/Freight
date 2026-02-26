package com.freight.backend.dto.common;

import java.util.List;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class ErrorResponse {

    private boolean success;
    private String code;
    private String message;
    private int status;
    private String path;
    private String timestamp;
    private String requestId;
    private List<FieldErrorItem> fieldErrors;

    @Data
    @Builder
    @AllArgsConstructor
    @NoArgsConstructor
    public static class FieldErrorItem {
        private String field;
        private String message;
    }
}
