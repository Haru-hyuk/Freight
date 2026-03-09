package com.freight.backend.service;

import com.freight.backend.dto.settlement.DriverSettlementSummaryResponse;
import com.freight.backend.entity.DeliveryPhoto;
import com.freight.backend.entity.Quote;
import com.freight.backend.entity.QuoteStop;
import com.freight.backend.entity.FcmToken;
import com.freight.backend.entity.Match;
import com.freight.backend.entity.Notification;
import com.freight.backend.entity.Settlement;
import com.freight.backend.exception.CustomException;
import com.freight.backend.exception.ErrorCode;
import com.freight.backend.repository.DeliveryPhotoRepository;
import com.freight.backend.repository.MatchRepository;
import com.freight.backend.repository.QuoteRepository;
import com.freight.backend.repository.QuoteStopRepository;
import com.freight.backend.repository.SettlementRepository;
import com.freight.backend.repository.SurchargeOptionRepository;
import com.freight.backend.repository.DriverRepository;
import com.freight.backend.pricing.SurchargeOptionEntity;
import com.freight.backend.pricing.SurchargeOptionType;
import com.freight.backend.routing.RouteDistanceService;
import com.freight.backend.routing.RoutePoint;
import jakarta.annotation.PostConstruct;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
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
    private static final Logger log = LoggerFactory.getLogger(SettlementService.class);
    private static final int MAX_SETTLEMENT_LIST_ROWS = 2000;

    private final SettlementRepository settlementRepository;
    private final MatchRepository matchRepository;
    private final QuoteRepository quoteRepository;
    private final QuoteStopRepository quoteStopRepository;
    private final DeliveryPhotoRepository deliveryPhotoRepository;
    private final SurchargeOptionRepository surchargeOptionRepository;
    private final DriverRepository driverRepository;
    private final RouteDistanceService routeDistanceService;
    private final NotificationService notificationService;

    private static final BigDecimal DEFAULT_PLATFORM_FEE_RATE = new BigDecimal("0.05");
    private static final BigDecimal FAST_SETTLEMENT_FEE_RATE = new BigDecimal("0.02");
    private static final BigDecimal INSTANT_SETTLEMENT_FEE_RATE = new BigDecimal("0.03");
    private static final int DEFAULT_FUEL_WON_PER_KM = 180;
    private static final int DEFAULT_TOLL_WON_PER_KM = 40;
    private static final String POLICY_PLATFORM_FEE_RATE = "SETTLEMENT_PLATFORM_FEE_RATE";
    private static final String POLICY_FUEL_WON_PER_KM = "SETTLEMENT_FUEL_WON_PER_KM";
    private static final String POLICY_TOLL_WON_PER_KM = "SETTLEMENT_TOLL_WON_PER_KM";

    @PostConstruct
    void bootstrapSettlementPolicies() {
        resolvePlatformFeeRate();
        resolveFuelWonPerKm();
        resolveTollWonPerKm();
    }

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
        // 이미 정산이 존재하면 반환 (동시성 보호를 위해 잠금 조회)
        var existing = settlementRepository.findByMatchIdForUpdate(matchId);
        if (existing.isPresent()) {
            return existing.get();
        }

        Match match = matchRepository.findById(matchId)
                .orElseThrow(() -> new CustomException(ErrorCode.MATCH_NOT_FOUND));
        Quote quote = quoteRepository.findById(match.getQuoteId())
                .orElseThrow(() -> new CustomException(ErrorCode.INVALID_REQUEST));

        BigDecimal totalFare = BigDecimal.valueOf(amount);

        BigDecimal platformFeeRate = resolvePlatformFeeRate();
        BigDecimal platformFee = totalFare.multiply(platformFeeRate)
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
        int routeDistanceKm = resolveRouteDistanceKm(quote);
        BigDecimal fuelCost = BigDecimal.valueOf((long) routeDistanceKm * resolveFuelWonPerKm())
                .setScale(0, RoundingMode.DOWN);
        BigDecimal tollFee = BigDecimal.valueOf((long) routeDistanceKm * resolveTollWonPerKm())
                .setScale(0, RoundingMode.DOWN);

        BigDecimal driverPayout = totalFare
                .subtract(platformFee)
                .subtract(fastFee)
                .subtract(fuelCost)
                .subtract(tollFee);
        String payoutAnomalyMemo = null;
        if (driverPayout.signum() < 0) {
            log.warn("[정산 경고] 기사 정산금액이 음수 발생 - matchId={}, driverId={}, " +
                    "totalFare={}, platformFee={}, fastFee={}, fuelCost={}, tollFee={}, 계산결과={}",
                    matchId, driverId, totalFare, platformFee, fastFee, fuelCost, tollFee, driverPayout);
            payoutAnomalyMemo = buildPayoutAnomalyMemo(
                    "NEGATIVE_TO_ZERO",
                    totalFare,
                    platformFee,
                    fastFee,
                    fuelCost,
                    tollFee
            );
            driverPayout = BigDecimal.ZERO;
        } else if (driverPayout.signum() == 0) {
            log.warn("[정산 경고] 기사 정산금액이 0원 - matchId={}, driverId={}, " +
                    "totalFare={}, platformFee={}, fastFee={}, fuelCost={}, tollFee={}",
                    matchId, driverId, totalFare, platformFee, fastFee, fuelCost, tollFee);
            payoutAnomalyMemo = buildPayoutAnomalyMemo(
                    "ZERO_PAYOUT",
                    totalFare,
                    platformFee,
                    fastFee,
                    fuelCost,
                    tollFee
            );
        }

        LocalDate dueDate = calculateDueDate(
                settlementType != null ? settlementType : Settlement.SettlementType.NORMAL
        );

        Settlement settlement = Settlement.builder()
                .matchId(matchId)
                .driverId(driverId)
                .shipperId(shipperId)
                .totalFare(totalFare)
                .platformFeeRate(platformFeeRate)
                .platformFee(platformFee)
                .fastFeeRate(fastFeeRate)
                .fastFee(fastFee)
                .routeDistanceKm(BigDecimal.valueOf(routeDistanceKm))
                .fuelCost(fuelCost)
                .tollFee(tollFee)
                .driverPayout(driverPayout)
                .shipperPaymentStatus(Settlement.ShipperPaymentStatus.COMPLETED)
                .shipperPaymentMethod(paymentMethod)
                .shipperPaidAt(LocalDateTime.now())
                .settlementType(settlementType != null ? settlementType : Settlement.SettlementType.NORMAL)
                .settlementStatus(Settlement.SettlementStatus.PENDING)
                .dueDate(dueDate)
                .depositAccount(resolveDepositAccount(driverId))
                .reviewMemo(payoutAnomalyMemo)
                .build();

        try {
            Settlement saved = settlementRepository.save(settlement);
            if (payoutAnomalyMemo != null) {
                notifyPayoutAnomaly(saved);
            }
            return saved;
        } catch (DataIntegrityViolationException e) {
            // 경합 조건으로 중복 생성 시도 시, 기존 정산 반환
            log.warn("Settlement already exists for matchId={}, returning existing", matchId);
            return settlementRepository.findByMatchId(matchId)
                    .orElseThrow(() -> new CustomException(ErrorCode.INVALID_REQUEST));
        }
    }

    private BigDecimal resolvePlatformFeeRate() {
        return resolveRatePolicyOption(POLICY_PLATFORM_FEE_RATE, DEFAULT_PLATFORM_FEE_RATE);
    }

    private int resolveFuelWonPerKm() {
        return resolveFixedPolicyWon(POLICY_FUEL_WON_PER_KM, DEFAULT_FUEL_WON_PER_KM);
    }

    private int resolveTollWonPerKm() {
        return resolveFixedPolicyWon(POLICY_TOLL_WON_PER_KM, DEFAULT_TOLL_WON_PER_KM);
    }

    private BigDecimal resolveRatePolicyOption(String code, BigDecimal fallbackRate) {
        return surchargeOptionRepository.findByCode(code)
                .filter(option -> Boolean.TRUE.equals(option.getEnabled()))
                .map(option -> {
                    BigDecimal multiplier = option.getMinMultiplier();
                    if (multiplier == null) {
                        multiplier = option.getMaxMultiplier();
                    }
                    if (multiplier == null) {
                        return fallbackRate;
                    }
                    BigDecimal rate = multiplier.subtract(BigDecimal.ONE);
                    if (rate.signum() < 0) {
                        return BigDecimal.ZERO;
                    }
                    return rate.setScale(4, RoundingMode.HALF_UP);
                })
                .orElseGet(() -> upsertRatePolicyOption(code, fallbackRate));
    }

    private int resolveFixedPolicyWon(String code, int fallbackWon) {
        return surchargeOptionRepository.findByCode(code)
                .filter(option -> Boolean.TRUE.equals(option.getEnabled()))
                .map(option -> {
                    BigDecimal fixed = option.getFixedAddWon();
                    if (fixed == null) {
                        fixed = option.getMinAddWon();
                    }
                    if (fixed == null) {
                        fixed = option.getMaxAddWon();
                    }
                    if (fixed == null) {
                        return fallbackWon;
                    }
                    int value = fixed.setScale(0, RoundingMode.HALF_UP).intValue();
                    return Math.max(0, value);
                })
                .orElseGet(() -> upsertFixedPolicyWon(code, fallbackWon));
    }

    private BigDecimal upsertRatePolicyOption(String code, BigDecimal fallbackRate) {
        BigDecimal safeRate = fallbackRate == null ? BigDecimal.ZERO : fallbackRate.max(BigDecimal.ZERO);
        BigDecimal multiplier = BigDecimal.ONE.add(safeRate).setScale(4, RoundingMode.HALF_UP);
        try {
            SurchargeOptionEntity created = surchargeOptionRepository.save(SurchargeOptionEntity.builder()
                    .code(code)
                    .optionType(SurchargeOptionType.MULT)
                    .minMultiplier(multiplier)
                    .maxMultiplier(multiplier)
                    .fixedAddWon(BigDecimal.ZERO)
                    .enabled(Boolean.TRUE)
                    .build());
            BigDecimal stored = created.getMinMultiplier() == null ? multiplier : created.getMinMultiplier();
            return stored.subtract(BigDecimal.ONE).max(BigDecimal.ZERO).setScale(4, RoundingMode.HALF_UP);
        } catch (Exception e) {
            log.warn("정산 정책 기본값 생성 실패(code={}): {}", code, e.getMessage());
            return safeRate.setScale(4, RoundingMode.HALF_UP);
        }
    }

    private int upsertFixedPolicyWon(String code, int fallbackWon) {
        int safe = Math.max(0, fallbackWon);
        try {
            SurchargeOptionEntity created = surchargeOptionRepository.save(SurchargeOptionEntity.builder()
                    .code(code)
                    .optionType(SurchargeOptionType.FIXED)
                    .fixedAddWon(BigDecimal.valueOf(safe))
                    .minAddWon(BigDecimal.valueOf(safe))
                    .maxAddWon(BigDecimal.valueOf(safe))
                    .enabled(Boolean.TRUE)
                    .build());
            BigDecimal stored = created.getFixedAddWon() == null ? BigDecimal.valueOf(safe) : created.getFixedAddWon();
            return Math.max(0, stored.setScale(0, RoundingMode.HALF_UP).intValue());
        } catch (Exception e) {
            log.warn("정산 정책 기본값 생성 실패(code={}): {}", code, e.getMessage());
            return safe;
        }
    }

    private int resolveRouteDistanceKm(Quote quote) {
        int fallback = Math.max(0, quote.getDistanceKm() == null ? 0 : quote.getDistanceKm());
        List<RoutePoint> points = buildRoutePoints(quote);
        if (points.size() < 2) {
            return Math.max(1, fallback);
        }
        try {
            int km = routeDistanceService.calculateDistanceKm(points);
            return Math.max(1, km);
        } catch (Exception e) {
            log.warn("정산 거리 계산 실패(quoteId={}): {}", quote.getQuoteId(), e.getMessage());
            return Math.max(1, fallback);
        }
    }

    private List<RoutePoint> buildRoutePoints(Quote quote) {
        List<RoutePoint> points = new ArrayList<>();
        if (quote.getOriginLat() != null && quote.getOriginLng() != null) {
            points.add(new RoutePoint(quote.getOriginLat(), quote.getOriginLng()));
        }
        if (quote.getQuoteId() != null) {
            List<QuoteStop> stops = quoteStopRepository.findByQuoteIdOrderBySeqAsc(quote.getQuoteId());
            for (QuoteStop stop : stops) {
                if (stop.getLat() == null || stop.getLng() == null) continue;
                points.add(new RoutePoint(stop.getLat(), stop.getLng()));
            }
        }
        if (quote.getDestinationLat() != null && quote.getDestinationLng() != null) {
            points.add(new RoutePoint(quote.getDestinationLat(), quote.getDestinationLng()));
        }
        return points;
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
        if (settlement.getShipperId() == null || !settlement.getShipperId().equals(shipperId)) {
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
    public DriverSettlementSummaryResponse getDriverSettlementSummary(Long driverId) {
        LocalDateTime now = LocalDateTime.now();
        LocalDateTime monthStart = now.toLocalDate().withDayOfMonth(1).atStartOfDay();
        LocalDateTime weekStart = now.minusDays(7);

        long totalCount = settlementRepository.countByDriverId(driverId);
        long pendingCount = settlementRepository.countByDriverIdAndSettlementStatus(
                driverId,
                Settlement.SettlementStatus.PENDING
        );
        long processingCount = settlementRepository.countByDriverIdAndSettlementStatus(
                driverId,
                Settlement.SettlementStatus.PROCESSING
        );
        long completedCount = settlementRepository.countByDriverIdAndSettlementStatus(
                driverId,
                Settlement.SettlementStatus.COMPLETED
        );
        long failedCount = settlementRepository.countByDriverIdAndSettlementStatus(
                driverId,
                Settlement.SettlementStatus.FAILED
        );

        BigDecimal totalPayout = safeAmount(settlementRepository.sumDriverPayoutByDriverId(driverId));
        BigDecimal pendingPayout = safeAmount(settlementRepository.sumDriverPayoutByDriverIdAndSettlementStatus(
                driverId,
                Settlement.SettlementStatus.PENDING
        )).add(safeAmount(settlementRepository.sumDriverPayoutByDriverIdAndSettlementStatus(
                driverId,
                Settlement.SettlementStatus.PROCESSING
        )));
        BigDecimal completedPayout = safeAmount(settlementRepository.sumDriverPayoutByDriverIdAndSettlementStatus(
                driverId,
                Settlement.SettlementStatus.COMPLETED
        ));
        BigDecimal failedPayout = safeAmount(settlementRepository.sumDriverPayoutByDriverIdAndSettlementStatus(
                driverId,
                Settlement.SettlementStatus.FAILED
        ));
        BigDecimal monthPayout = safeAmount(settlementRepository.sumDriverPayoutByDriverIdAndCreatedAtAfter(
                driverId,
                monthStart
        ));
        long weekCompletedCount = settlementRepository.countByDriverIdAndStatusAndCompletedAtAfter(
                driverId,
                Settlement.SettlementStatus.COMPLETED,
                weekStart
        );
        BigDecimal weekCompletedPayout = safeAmount(settlementRepository.sumDriverPayoutByDriverIdAndStatusAndCompletedAtAfter(
                driverId,
                Settlement.SettlementStatus.COMPLETED,
                weekStart
        ));

        // 기사 화면 합계 KPI는 정산 테이블 집계값을 단일 기준으로 사용한다.
        return DriverSettlementSummaryResponse.builder()
                .driverId(driverId)
                .totalSettlementCount(totalCount)
                .pendingSettlementCount(pendingCount + processingCount)
                .completedSettlementCount(completedCount)
                .failedSettlementCount(failedCount)
                .totalPayoutAmount(totalPayout)
                .pendingPayoutAmount(pendingPayout)
                .completedPayoutAmount(completedPayout)
                .failedPayoutAmount(failedPayout)
                .monthPayoutAmount(monthPayout)
                .weekCompletedCount(weekCompletedCount)
                .weekCompletedPayoutAmount(weekCompletedPayout)
                .calculatedAt(now)
                .build();
    }

    @Transactional(readOnly = true)
    public List<Settlement> getShipperSettlements(Long shipperId) {
        return settlementRepository.findByShipperId(shipperId).stream()
                .sorted(Comparator.comparing(Settlement::getCreatedAt, Comparator.nullsLast(Comparator.reverseOrder())))
                .toList();
    }

    @Transactional(readOnly = true)
    public List<Settlement> listAllSettlements() {
        return settlementRepository.findAll(
                        PageRequest.of(0, MAX_SETTLEMENT_LIST_ROWS, Sort.by(Sort.Direction.DESC, "createdAt"))
                )
                .getContent();
    }

    @Transactional
    public Settlement confirmByShipper(Long shipperId, Long matchId) {
        Settlement settlement = settlementRepository.findByMatchId(matchId)
                .orElseThrow(() -> new CustomException(ErrorCode.INVALID_REQUEST));

        if (settlement.getShipperId() == null || !settlement.getShipperId().equals(shipperId)) {
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
            DeliveryPhoto deliveryPhoto = latestDeliveryPhoto.get();
            if (deliveryPhoto.getCreatedAt() == null || deliveryPhoto.getCreatedAt().isAfter(cutoff)) {
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

    private String resolveDepositAccount(Long driverId) {
        if (driverId == null || driverId <= 0) {
            return null;
        }
        return driverRepository.findById(driverId)
                .map(driver -> {
                    String bankName = normalizeText(driver.getBankName());
                    String bankAccount = normalizeText(driver.getBankAccount());
                    if (bankAccount.isBlank()) {
                        return null;
                    }
                    if (bankName.isBlank()) {
                        return bankAccount;
                    }
                    return bankName + " " + bankAccount;
                })
                .orElse(null);
    }

    private String normalizeText(String value) {
        return value == null ? "" : value.trim();
    }

    private BigDecimal safeAmount(BigDecimal value) {
        return value == null ? BigDecimal.ZERO : value.max(BigDecimal.ZERO);
    }

    private String buildPayoutAnomalyMemo(
            String reason,
            BigDecimal totalFare,
            BigDecimal platformFee,
            BigDecimal fastFee,
            BigDecimal fuelCost,
            BigDecimal tollFee
    ) {
        return String.format(
                "PAYOUT_ANOMALY[%s] total=%s, platform=%s, fast=%s, fuel=%s, toll=%s",
                reason,
                toPlain(totalFare),
                toPlain(platformFee),
                toPlain(fastFee),
                toPlain(fuelCost),
                toPlain(tollFee)
        );
    }

    private String toPlain(BigDecimal value) {
        return value == null ? "0" : value.stripTrailingZeros().toPlainString();
    }

    private void notifyPayoutAnomaly(Settlement settlement) {
        if (settlement == null || settlement.getMatchId() == null) {
            return;
        }

        // 관리자 알림 (긴급 검토 필요)
        String adminMessage = String.format(
                "[정산 이상] matchId=%d, driverId=%d, 정산금액=%s원 (검토 필요)",
                settlement.getMatchId(),
                settlement.getDriverId(),
                settlement.getDriverPayout() == null ? "0" : settlement.getDriverPayout().toPlainString()
        );
        try {
            notificationService.notifyAllAdmins(
                    settlement.getMatchId(),
                    Notification.Type.SETTLEMENT_ANOMALY,
                    adminMessage
            );
        } catch (Exception ex) {
            log.error("정산 이상 관리자 알림 전송 실패(matchId={}): {}", settlement.getMatchId(), ex.getMessage(), ex);
        }

        // 기사 알림 (정산 확인 요청)
        if (settlement.getDriverId() != null) {
            String driverMessage = String.format(
                    "정산 금액이 예상과 다르게 계산되어 운영팀에서 검토 중입니다. (매칭: %d)",
                    settlement.getMatchId()
            );
            try {
                notificationService.createNotification(
                        FcmToken.UserType.DRIVER,
                        settlement.getDriverId(),
                        settlement.getMatchId(),
                        Notification.Type.SETTLEMENT_ANOMALY,
                        driverMessage
                );
            } catch (Exception ex) {
                log.error("정산 이상 기사 알림 전송 실패(matchId={}): {}", settlement.getMatchId(), ex.getMessage(), ex);
            }
        }
    }
}
