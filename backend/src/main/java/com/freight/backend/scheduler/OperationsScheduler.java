package com.freight.backend.scheduler;

import com.freight.backend.gpsload.tracking.repository.GpsLogRepository;
import com.freight.backend.repository.NotificationRepository;
import com.freight.backend.service.MatchService;
import com.freight.backend.service.SettlementService;
import java.time.LocalDateTime;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/**
 * 운영 자동화 스케줄러
 * - 결제 타임아웃 매칭 자동 해제
 * - 하차 후 24시간 경과 정산 자동 확정
 * - GPS 로그 정리 (90일 이상)
 * - 알림 정리 (30일 이상)
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class OperationsScheduler {

    private final MatchService matchService;
    private final SettlementService settlementService;
    private final GpsLogRepository gpsLogRepository;
    private final NotificationRepository notificationRepository;

    @Value("${operations.scheduler.enabled:true}")
    private boolean schedulerEnabled;

    @Value("${operations.match.payment-timeout-minutes:60}")
    private int paymentTimeoutMinutes;

    @Value("${operations.settlement.auto-confirm-hours:24}")
    private int settlementAutoConfirmHours;

    @Value("${operations.cleanup.gps-log-retention-days:90}")
    private int gpsLogRetentionDays;

    @Value("${operations.cleanup.notification-retention-days:30}")
    private int notificationRetentionDays;

    /** 결제 미완료 매칭 자동 해제 (기본 60분, 1분마다 체크) */
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

    /** GPS 로그 정리 (매일 새벽 3시, 기본 90일 이상 경과 로그 삭제) */
    @Scheduled(cron = "${operations.cleanup.gps-log-cron:0 0 3 * * *}")
    @Transactional
    public void cleanupOldGpsLogs() {
        if (!schedulerEnabled) {
            return;
        }
        LocalDateTime threshold = LocalDateTime.now().minusDays(gpsLogRetentionDays);
        int deleted = gpsLogRepository.deleteByLoggedAtBefore(threshold);
        if (deleted > 0) {
            log.info("Deleted {} old GPS logs (older than {} days).", deleted, gpsLogRetentionDays);
        }
    }

    /** 알림 정리 (매일 새벽 4시, 기본 30일 이상 경과 알림 삭제) */
    @Scheduled(cron = "${operations.cleanup.notification-cron:0 0 4 * * *}")
    @Transactional
    public void cleanupOldNotifications() {
        if (!schedulerEnabled) {
            return;
        }
        LocalDateTime threshold = LocalDateTime.now().minusDays(notificationRetentionDays);
        int deleted = notificationRepository.deleteByCreatedAtBefore(threshold);
        if (deleted > 0) {
            log.info("Deleted {} old notifications (older than {} days).", deleted, notificationRetentionDays);
        }
    }
}
