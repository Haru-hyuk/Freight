package com.freight.backend.scheduler;

import com.freight.backend.service.MatchService;
import com.freight.backend.service.SettlementService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/**
 * 운영 자동화 스케줄러
 * - 결제 타임아웃 매칭 자동 해제
 * - 하차 후 24시간 경과 정산 자동 확정
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class OperationsScheduler {

    private final MatchService matchService;
    private final SettlementService settlementService;

    @Value("${operations.scheduler.enabled:true}")
    private boolean schedulerEnabled;

    @Value("${operations.match.payment-timeout-minutes:15}")
    private int paymentTimeoutMinutes;

    @Value("${operations.settlement.auto-confirm-hours:24}")
    private int settlementAutoConfirmHours;

    /** 15분간 결제 미완료 매칭 자동 해제 (1분마다 체크) */
    @Scheduled(fixedDelayString = "${operations.match.payment-timeout-check-ms:60000}")
    public void releaseTimedOutMatches() {
        if (!schedulerEnabled) {
            return;
        }
        int released = matchService.releaseTimedOutAwaitingPaymentMatches(paymentTimeoutMinutes);
        if (released > 0) {
            log.info("Released {} timed-out matches waiting for payment.", released);
        }
    }

    /** 하차사진 업로드 후 24시간 경과 시 정산 자동 확정 (5분마다 체크) */
    @Scheduled(fixedDelayString = "${operations.settlement.auto-confirm-check-ms:300000}")
    public void autoConfirmSettlements() {
        if (!schedulerEnabled) {
            return;
        }
        int confirmed = settlementService.autoConfirmEligibleSettlements(settlementAutoConfirmHours);
        if (confirmed > 0) {
            log.info("Auto-confirmed {} settlements.", confirmed);
        }
    }
}
