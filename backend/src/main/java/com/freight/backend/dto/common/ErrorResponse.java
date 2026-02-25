package com.freight.backend.dto.common;

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
}
