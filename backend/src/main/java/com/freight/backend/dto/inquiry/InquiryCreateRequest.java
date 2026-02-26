package com.freight.backend.dto.inquiry;

import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class InquiryCreateRequest {
    @NotBlank
    private String title;

    @NotBlank
    private String content;
}
