package com.freight.backend.dto.settlement;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class DriverSettlementSummaryResponse {

    private Long driverId;

    private long totalSettlementCount;
    private long pendingSettlementCount;
    private long completedSettlementCount;
    private long failedSettlementCount;

    private BigDecimal totalPayoutAmount;
    private BigDecimal pendingPayoutAmount;
    private BigDecimal completedPayoutAmount;
    private BigDecimal failedPayoutAmount;

    private BigDecimal monthPayoutAmount;
    private long weekCompletedCount;
    private BigDecimal weekCompletedPayoutAmount;

    private LocalDateTime calculatedAt;
}

