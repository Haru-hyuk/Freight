package com.freight.backend.dto.inquiry;

import com.freight.backend.entity.Inquiry;
import java.time.LocalDateTime;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
@AllArgsConstructor
public class InquiryResponse {
    private Long inquiryId;
    private Long shipperId;
    private Long driverId;
    private String writerType;
    private String title;
    private String content;
    private String status;
    private String answer;
    private Long answeredByAdminId;
    private LocalDateTime answeredAt;
    private LocalDateTime createdAt;

    public static InquiryResponse from(Inquiry inquiry) {
        return InquiryResponse.builder()
                .inquiryId(inquiry.getInquiryId())
                .shipperId(inquiry.getShipperId())
                .driverId(inquiry.getDriverId())
                .writerType(inquiry.getWriterType() == null ? null : inquiry.getWriterType().name())
                .title(inquiry.getTitle())
                .content(inquiry.getContent())
                .status(inquiry.getStatus().name())
                .answer(inquiry.getAnswer())
                .answeredByAdminId(inquiry.getAnsweredByAdminId())
                .answeredAt(inquiry.getAnsweredAt())
                .createdAt(inquiry.getCreatedAt())
                .build();
    }
}
