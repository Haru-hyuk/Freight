package com.freight.backend.dto.shipper;

import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class ShipperPaymentMethodSummaryResponse {
    private String id;
    private String type;
    private String provider;
    private String holderName;
    private String last4;
    private String registeredAt;
    private String lastUsedAt;
    private Long usageCount;
    private Boolean isDefault;
}
