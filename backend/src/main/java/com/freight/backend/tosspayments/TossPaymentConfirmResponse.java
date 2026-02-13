package com.freight.backend.tosspayments;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
@JsonIgnoreProperties(ignoreUnknown = true)
public class TossPaymentConfirmResponse {

    @JsonProperty("paymentKey")
    private String paymentKey;

    @JsonProperty("orderId")
    private String orderId;

    @JsonProperty("status")
    private String status;

    @JsonProperty("totalAmount")
    private Long totalAmount;

    @JsonProperty("approvedAt")
    private String approvedAt;

    public boolean isDone() {
        return "DONE".equalsIgnoreCase(status);
    }

    public LocalDateTime getApprovedAtAsLocalDateTime() {
        if (approvedAt == null || approvedAt.isBlank()) {
            return null;
        }
        try {
            return LocalDateTime.parse(approvedAt.replace("+09:00", "").replace("Z", ""),
                    DateTimeFormatter.ISO_LOCAL_DATE_TIME);
        } catch (Exception e) {
            return null;
        }
    }
}
