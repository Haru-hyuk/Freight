package com.freight.backend.service;

import com.freight.backend.entity.DeliveryPhoto;
import com.freight.backend.entity.FcmToken;
import com.freight.backend.entity.Match;
import com.freight.backend.entity.Notification;
import com.freight.backend.entity.Settlement;
import com.freight.backend.exception.CustomException;
import com.freight.backend.exception.ErrorCode;
import com.freight.backend.repository.DeliveryPhotoRepository;
import com.freight.backend.repository.MatchRepository;
import com.freight.backend.repository.SettlementRepository;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Comparator;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * 정산 서비스
 * - 결제 후 정산 생성
 * - 플랫폼/빠른정산 수수료 계산
 * - 화주 확인/자동 확정
 */
@Service
@RequiredArgsConstructor
public class SettlementService {

    private final SettlementRepository settlementRepository;
    private final MatchRepository matchRepository;
    private final DeliveryPhotoRepository deliveryPhotoRepository;
    private final NotificationService notificationService;

    private static final BigDecimal DEFAULT_PLATFORM_FEE_RATE = new BigDecimal("0.05");
    private static final BigDecimal FAST_SETTLEMENT_FEE_RATE = new BigDecimal("0.02");
    private static final BigDecimal INSTANT_SETTLEMENT_FEE_RATE = new BigDecimal("0.03");

    /** 결제 완료 후 정산 생성 (플랫폼 수수료 + 빠른정산 수수료 계산) */
    @Transactional
    public Settlement createAfterPaymentConfirm(
            String orderId,
            long amount,
            Long matchId,
            Long driverId,
            Long shipperId,
            Settlement.SettlementType settlementType,
            Settlement.ShipperPaymentMethod paymentMethod
    ) {
        if (matchId == null || driverId == null || shipperId == null) {
            throw new CustomException(ErrorCode.INVALID_REQUEST);
        }
        if (settlementRepository.existsByMatchId(matchId)) {
            return settlementRepository.findByMatchId(matchId)
                    .orElseThrow(() -> new CustomException(ErrorCode.INVALID_REQUEST));
        }

        BigDecimal totalFare = BigDecimal.valueOf(amount);

        BigDecimal platformFee = totalFare.multiply(DEFAULT_PLATFORM_FEE_RATE)
                .setScale(0, RoundingMode.DOWN);

        BigDecimal fastFeeRate = BigDecimal.ZERO;
        BigDecimal fastFee = BigDecimal.ZERO;

        if (settlementType != null) {
            switch (settlementType) {
                case FAST -> {
                    fastFeeRate = FAST_SETTLEMENT_FEE_RATE;
                    fastFee = totalFare.multiply(fastFeeRate).setScale(0, RoundingMode.DOWN);
                }
                case INSTANT -> {
                    fastFeeRate = INSTANT_SETTLEMENT_FEE_RATE;
                    fastFee = totalFare.multiply(fastFeeRate).setScale(0, RoundingMode.DOWN);
                }
                default -> {
                }
            }
        }

        BigDecimal driverPayout = totalFare.subtract(platformFee).subtract(fastFee);

        LocalDate dueDate = calculateDueDate(
                settlementType != null ? settlementType : Settlement.SettlementType.NORMAL
        );

        Settlement settlement = Settlement.builder()
                .matchId(matchId)
                .driverId(driverId)
                .shipperId(shipperId)
                .totalFare(totalFare)
                .platformFeeRate(DEFAULT_PLATFORM_FEE_RATE)
                .platformFee(platformFee)
                .fastFeeRate(fastFeeRate)
                .fastFee(fastFee)
                .driverPayout(driverPayout)
                .shipperPaymentStatus(Settlement.ShipperPaymentStatus.COMPLETED)
                .shipperPaymentMethod(paymentMethod)
                .shipperPaidAt(LocalDateTime.now())
                .settlementType(settlementType != null ? settlementType : Settlement.SettlementType.NORMAL)
                .settlementStatus(Settlement.SettlementStatus.PENDING)
                .dueDate(dueDate)
                .build();

        return settlementRepository.save(settlement);
    }

    private LocalDate calculateDueDate(Settlement.SettlementType type) {
        LocalDate today = LocalDate.now();
        return switch (type) {
            case INSTANT -> today;
            case FAST -> today.plusDays(1);
            case NORMAL -> today.plusDays(7);
        };
    }

    @Transactional(readOnly = true)
    public Settlement getSettlement(Long settlementId) {
        return settlementRepository.findById(settlementId)
                .orElseThrow(() -> new CustomException(ErrorCode.INVALID_REQUEST));
    }

    @Transactional(readOnly = true)
    public Settlement getSettlementByMatchId(Long matchId) {
        return settlementRepository.findByMatchId(matchId)
                .orElseThrow(() -> new CustomException(ErrorCode.INVALID_REQUEST));
    }

    @Transactional(readOnly = true)
    public Settlement getSettlementForShipper(Long shipperId, Long matchId) {
        Settlement settlement = settlementRepository.findByMatchId(matchId)
                .orElseThrow(() -> new CustomException(ErrorCode.INVALID_REQUEST));
        if (!settlement.getShipperId().equals(shipperId)) {
            throw new CustomException(ErrorCode.AUTH_FORBIDDEN);
        }
        return settlement;
    }

    @Transactional(readOnly = true)
    public Settlement getSettlementForDriver(Long driverId, Long matchId) {
        Settlement settlement = settlementRepository.findByMatchId(matchId)
                .orElseThrow(() -> new CustomException(ErrorCode.INVALID_REQUEST));
        if (!settlement.getDriverId().equals(driverId)) {
            throw new CustomException(ErrorCode.AUTH_FORBIDDEN);
        }
        return settlement;
    }

    @Transactional(readOnly = true)
    public List<Settlement> getDriverSettlements(Long driverId) {
        return settlementRepository.findByDriverId(driverId).stream()
                .sorted(Comparator.comparing(Settlement::getCreatedAt, Comparator.nullsLast(Comparator.reverseOrder())))
                .toList();
    }

    @Transactional(readOnly = true)
    public List<Settlement> getShipperSettlements(Long shipperId) {
        return settlementRepository.findByShipperId(shipperId).stream()
                .sorted(Comparator.comparing(Settlement::getCreatedAt, Comparator.nullsLast(Comparator.reverseOrder())))
                .toList();
    }

    @Transactional(readOnly = true)
    public List<Settlement> listAllSettlements() {
        return settlementRepository.findAll().stream()
                .sorted(Comparator.comparing(Settlement::getCreatedAt, Comparator.nullsLast(Comparator.reverseOrder())))
                .toList();
    }

    @Transactional
    public Settlement confirmByShipper(Long shipperId, Long matchId) {
        Settlement settlement = settlementRepository.findByMatchId(matchId)
                .orElseThrow(() -> new CustomException(ErrorCode.INVALID_REQUEST));

        if (!settlement.getShipperId().equals(shipperId)) {
            throw new CustomException(ErrorCode.AUTH_FORBIDDEN);
        }
        if (settlement.getSettlementStatus() == Settlement.SettlementStatus.COMPLETED) {
            return settlement;
        }

        Match match = matchRepository.findById(matchId)
                .orElseThrow(() -> new CustomException(ErrorCode.MATCH_NOT_FOUND));
        if (match.getStatus() != Match.Status.COMPLETED) {
            throw new CustomException(ErrorCode.INVALID_REQUEST);
        }
        if (!deliveryPhotoRepository.existsByMatchIdAndType(matchId, DeliveryPhoto.Type.DELIVERY)) {
            throw new CustomException(ErrorCode.INVALID_REQUEST);
        }

        settlement.setSettlementStatus(Settlement.SettlementStatus.COMPLETED);
        settlement.setCompletedAt(LocalDateTime.now());

        notificationService.createNotification(
                FcmToken.UserType.DRIVER,
                settlement.getDriverId(),
                matchId,
                Notification.Type.MATCH_UPDATED,
                "화주 확인으로 정산이 확정되었습니다."
        );
        notificationService.createNotification(
                FcmToken.UserType.SHIPPER,
                shipperId,
                matchId,
                Notification.Type.MATCH_UPDATED,
                "정산이 확정되었습니다."
        );

        return settlement;
    }

    /** 배송사진 업로드 후 24시간 경과 시 자동 정산 확정 (스케줄러에서 호출) */
    @Transactional
    public int autoConfirmEligibleSettlements(int afterHours) {
        int safeHours = Math.max(1, afterHours);
        LocalDateTime cutoff = LocalDateTime.now().minusHours(safeHours);

        List<Settlement> pending = settlementRepository.findBySettlementStatus(Settlement.SettlementStatus.PENDING);
        int updated = 0;

        for (Settlement settlement : pending) {
            Long matchId = settlement.getMatchId();
            Match match = matchRepository.findById(matchId).orElse(null);
            if (match == null || match.getStatus() != Match.Status.COMPLETED) {
                continue;
            }

            var latestDeliveryPhoto = deliveryPhotoRepository.findFirstByMatchIdAndTypeOrderByCreatedAtDesc(
                    matchId,
                    DeliveryPhoto.Type.DELIVERY
            );
            if (latestDeliveryPhoto.isEmpty()) {
                continue;
            }
            if (latestDeliveryPhoto.get().getCreatedAt() == null || latestDeliveryPhoto.get().getCreatedAt().isAfter(cutoff)) {
                continue;
            }

            settlement.setSettlementStatus(Settlement.SettlementStatus.COMPLETED);
            settlement.setCompletedAt(LocalDateTime.now());
            updated += 1;

            notificationService.createNotification(
                    FcmToken.UserType.DRIVER,
                    settlement.getDriverId(),
                    matchId,
                    Notification.Type.MATCH_UPDATED,
                    "화주 확인 시간이 지나 정산이 자동 확정되었습니다."
            );
            notificationService.createNotification(
                    FcmToken.UserType.SHIPPER,
                    settlement.getShipperId(),
                    matchId,
                    Notification.Type.MATCH_UPDATED,
                    "24시간 경과로 정산이 자동 확정되었습니다."
            );
        }

        return updated;
    }
}
