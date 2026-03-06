package com.freight.backend.service;

import com.freight.backend.dto.admin.ActivityLogResponse;
import com.freight.backend.dto.admin.AdminPricingAdditionalUpdateRequest;
import com.freight.backend.dto.admin.AdminTruckSpecUpdateRequest;
import com.freight.backend.dto.admin.AdminPricingVehicleUpdateRequest;
import com.freight.backend.dto.admin.AdminQuoteUpdateRequest;
import com.freight.backend.dto.admin.DeliveryHistoryRowResponse;
import com.freight.backend.dto.admin.DispatchRowResponse;
import com.freight.backend.dto.admin.DriverApprovalRowResponse;
import com.freight.backend.dto.admin.LiveDeliveryDetailResponse;
import com.freight.backend.dto.admin.LiveDeliveryRowResponse;
import com.freight.backend.dto.admin.PaginatedResponse;
import com.freight.backend.dto.admin.SettlementApprovalRowResponse;
import com.freight.backend.dto.admin.TruckApprovalRowResponse;
import com.freight.backend.entity.Driver;
import com.freight.backend.entity.Match;
import com.freight.backend.entity.Notification;
import com.freight.backend.entity.Payment;
import com.freight.backend.entity.Quote;
import com.freight.backend.entity.QuoteStop;
import com.freight.backend.entity.SanctionEvent;
import com.freight.backend.entity.Settlement;
import com.freight.backend.entity.Shipper;
import com.freight.backend.entity.Truck;
import com.freight.backend.exception.CustomException;
import com.freight.backend.exception.ErrorCode;
import com.freight.backend.gpsload.tracking.entity.GpsLog;
import com.freight.backend.gpsload.tracking.repository.GpsLogRepository;
import com.freight.backend.gpsload.loadplan.entity.TruckSpecCatalog;
import com.freight.backend.gpsload.loadplan.repository.TruckSpecCatalogRepository;
import com.freight.backend.pricing.PricingRateCatalog;
import com.freight.backend.pricing.SurchargeOptionEntity;
import com.freight.backend.pricing.SurchargeOptionType;
import com.freight.backend.pricing.PricingRateCatalogRepository;
import com.freight.backend.repository.DriverRepository;
import com.freight.backend.repository.MatchRepository;
import com.freight.backend.repository.NotificationRepository;
import com.freight.backend.repository.PaymentRepository;
import com.freight.backend.repository.QuoteRepository;
import com.freight.backend.repository.QuoteStopRepository;
import com.freight.backend.repository.SanctionEventRepository;
import com.freight.backend.repository.SettlementRepository;
import com.freight.backend.repository.ShipperRepository;
import com.freight.backend.repository.SurchargeOptionRepository;
import com.freight.backend.repository.TruckRepository;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class AdminIntegrationService {
    private static final int LIVE_ROUTE_POINT_LIMIT = 100;
    private static final int LIVE_DELAY_MINUTES = 10;
    private static final int DEFAULT_DISPATCH_SNAPSHOT_LIMIT = 500;
    private static final int REFERENCE_CATALOG_LIMIT = 2000;
    private static final int ACTIVITY_SOURCE_LIMIT = 500;

    @Value("${admin.integration.dispatch-snapshot-limit:500}")
    private int dispatchSnapshotLimit;

    private final QuoteRepository quoteRepository;
    private final MatchRepository matchRepository;
    private final SettlementRepository settlementRepository;
    private final PaymentRepository paymentRepository;
    private final DriverRepository driverRepository;
    private final ShipperRepository shipperRepository;
    private final TruckRepository truckRepository;
    private final QuoteStopRepository quoteStopRepository;
    private final GpsLogRepository gpsLogRepository;
    private final NotificationRepository notificationRepository;
    private final PricingRateCatalogRepository pricingRateCatalogRepository;
    private final SurchargeOptionRepository surchargeOptionRepository;
    private final TruckSpecCatalogRepository truckSpecCatalogRepository;
    private final SanctionEventRepository sanctionEventRepository;

    @Transactional(readOnly = true)
    public Map<String, Object> listDeliveryHistory(String q, String status, Integer page, Integer size) {
        PaginatedResponse<DeliveryHistoryRowResponse> typed = listDeliveryHistoryTyped(q, status, page, size);
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("items", typed.getItems().stream().map(this::toDeliveryHistoryRowMap).toList());
        out.put("total", typed.getTotal());
        return out;
    }

    @Transactional(readOnly = true)
    public PaginatedResponse<DeliveryHistoryRowResponse> listDeliveryHistoryTyped(String q, String status, Integer page, Integer size) {
        String statusFilter = normalizeText(status).toUpperCase(Locale.ROOT);
        String keyword = normalizeText(q).toLowerCase(Locale.ROOT);
        Match.Status dbStatus = parseMatchStatus(statusFilter);
        int p = page == null || page < 1 ? 1 : page;
        int s = size == null || size < 1 ? 20 : Math.min(size, 100);

        if (!statusFilter.isBlank() && dbStatus == null) {
            return PaginatedResponse.of(List.of(), 0);
        }

        if (keyword.isBlank()) {
            long total = matchRepository.countByStatusFiltered(dbStatus);
            List<Match> matches = matchRepository.findByStatusFiltered(dbStatus, PageRequest.of(p - 1, s));
            List<DeliveryHistoryRowResponse> rows = buildDispatchSnapshotsForMatches(matches).stream()
                    .filter(snapshot -> snapshot.quote() != null)
                    .map(this::toDeliveryHistoryRowDto)
                    .toList();
            return PaginatedResponse.of(rows, (int) total);
        }

        List<DeliveryHistoryRowResponse> filtered = buildDispatchSnapshots().stream()
                .filter(snapshot -> snapshot.quote() != null)
                .map(this::toDeliveryHistoryRowDto)
                .filter(row -> statusFilter.isBlank() || statusFilter.equalsIgnoreCase(defaultText(row.getMatchStatus(), "")))
                .filter(row -> containsDeliveryHistoryKeyword(row, keyword))
                .toList();

        int total = filtered.size();
        int from = Math.min((p - 1) * s, total);
        int to = Math.min(from + s, total);
        return PaginatedResponse.of(filtered.subList(from, to), total);
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> listLiveDeliveries() {
        return listLiveDeliveriesTyped().stream()
                .map(this::toLiveDeliveryRowMap)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<LiveDeliveryRowResponse> listLiveDeliveriesTyped() {
        int limit = resolveDispatchSnapshotLimit();
        List<Match> matches = matchRepository.findRecentMatches(PageRequest.of(0, limit));
        return buildDispatchSnapshotsForMatches(matches).stream()
                .filter(snapshot -> snapshot.quote() != null)
                .filter(snapshot -> snapshot.match().getStatus() != Match.Status.CANCELLED)
                .map(this::toLiveDeliveryRowDto)
                .toList();
    }

    @Transactional(readOnly = true)
    public Map<String, Object> getLiveDeliveryDetail(String matchId) {
        return toLiveDeliveryDetailMap(getLiveDeliveryDetailTyped(matchId));
    }

    @Transactional(readOnly = true)
    public LiveDeliveryDetailResponse getLiveDeliveryDetailTyped(String matchId) {
        Long id = parseFlexibleId(matchId, "M");
        Match match = matchRepository.findById(id)
                .orElseThrow(() -> new CustomException(ErrorCode.INVALID_REQUEST));
        DispatchSnapshot snapshot = buildDispatchSnapshotsForMatches(List.of(match)).stream()
                .findFirst()
                .orElseThrow(() -> new CustomException(ErrorCode.INVALID_REQUEST));

        Quote quote = snapshot.quote();
        Truck truck = snapshot.truck();
        if (quote == null) {
            throw new CustomException(ErrorCode.INVALID_REQUEST);
        }
        List<GpsLog> recentLogs = findRecentGpsLogs(snapshot.match().getMatchId(), LIVE_ROUTE_POINT_LIMIT);
        GpsLog latest = recentLogs.isEmpty() ? null : recentLogs.get(0);
        List<Map<String, Object>> plannedRoute = buildPlannedRoute(quote);
        List<Map<String, Object>> currentRoute = buildCurrentRoute(snapshot.match(), quote, recentLogs);
        int progress = resolveLiveProgress(snapshot.match(), quote, latest);

        List<Map<String, Object>> timeline = new ArrayList<>();
        timeline.add(timelineEvent("created", "견적 생성", quote.getCreatedAt(), null));
        timeline.add(timelineEvent("matched", "매칭 생성", snapshot.match().getCreatedAt(), null));
        if (snapshot.match().getAcceptedAt() != null) {
            timeline.add(timelineEvent("accepted", "기사 수락", snapshot.match().getAcceptedAt(), snapshot.driver() == null ? null : snapshot.driver().getName()));
        }
        if (snapshot.match().getStatus() == Match.Status.IN_TRANSIT || snapshot.match().getStatus() == Match.Status.COMPLETED) {
            timeline.add(timelineEvent("transit", "운송 시작", snapshot.match().getUpdatedAt(), null));
        }
        if (snapshot.match().getStatus() == Match.Status.COMPLETED) {
            timeline.add(timelineEvent("completed", "운송 완료", snapshot.match().getUpdatedAt(), null));
        }

        return LiveDeliveryDetailResponse.builder()
                .matchId(formatId("M", snapshot.match().getMatchId()))
                .cargoType(defaultText(quote.getCargoType(), "-"))
                .cargoWeightKg(toInt(quote.getWeightKg()))
                .truckType(truck == null ? "-" : defaultText(truck.getVehicleType(), "-"))
                .truckWeightTon(truck == null || truck.getTonnage() == null ? 0 : truck.getTonnage().doubleValue())
                .truckVolumeCbm(truck == null || truck.getMaxVolume() == null ? 0 : truck.getMaxVolume().doubleValue())
                .totalRouteKm(toInt(quote.getDistanceKm()))
                .routeProgressPercent(progress)
                .deviationReason(isDeviation(latest) ? "실시간 경로 이탈 감지" : null)
                .plannedRoute(plannedRoute.stream().map(this::toRoutePointDto).toList())
                .currentRoute(currentRoute.stream().map(this::toRoutePointDto).toList())
                .timeline(timeline.stream().map(this::toTimelineEventDto).toList())
                .build();
    }

    @Transactional(readOnly = true)
    public Map<String, Object> listDispatchRows(
            String q,
            String status,
            String dispatchState,
            String paymentStatus,
            String settlementStatus,
            Integer page,
            Integer size
    ) {
        String keyword = normalizeText(q).toLowerCase(Locale.ROOT);
        String statusFilter = normalizeText(status).toUpperCase(Locale.ROOT);
        String dispatchFilter = normalizeText(dispatchState).toUpperCase(Locale.ROOT);
        String paymentFilter = normalizeText(paymentStatus).toUpperCase(Locale.ROOT);
        String settlementFilter = normalizeText(settlementStatus).toUpperCase(Locale.ROOT);

        // DB 레벨 필터링: status + accepted 조건
        Match.Status dbStatus = statusFilter.isBlank() ? null : parseMatchStatus(statusFilter);
        Boolean dbAccepted = parseAcceptedFilter(dispatchFilter);

        // 키워드/결제/정산 필터가 없으면 DB 레벨 페이지네이션 사용
        boolean canUseDbPagination = keyword.isBlank() && paymentFilter.isBlank() && settlementFilter.isBlank();

        int p = page == null || page < 1 ? 1 : page;
        int s = size == null || size < 1 ? 20 : Math.min(size, 100);

        if (canUseDbPagination) {
            // DB 페이지네이션 (최적화된 경로)
            long total = matchRepository.countByAcceptedAndStatusFiltered(dbAccepted, dbStatus);
            List<Match> matches = matchRepository.findByAcceptedAndStatusFiltered(
                    dbAccepted, dbStatus, PageRequest.of(p - 1, s)
            );
            List<DispatchSnapshot> snapshots = buildDispatchSnapshotsForMatches(matches);
            List<Map<String, Object>> rows = snapshots.stream()
                    .filter(snapshot -> snapshot.quote() != null)
                    .map(this::toDispatchRow)
                    .toList();
            Map<String, Object> out = new LinkedHashMap<>();
            out.put("items", rows);
            out.put("total", (int) total);
            return out;
        }

        // 복합 필터 (키워드/결제/정산): 메모리 필터링 필요
        List<Map<String, Object>> rows = buildDispatchSnapshots().stream()
                .filter(snapshot -> snapshot.quote() != null)
                .map(this::toDispatchRow)
                .toList();

        List<Map<String, Object>> filtered = rows.stream()
                .filter(row -> statusFilter.isBlank() || statusFilter.equals(String.valueOf(row.get("matchStatus"))))
                .filter(row -> {
                    if (dispatchFilter.isBlank()) return true;
                    boolean assigned = Boolean.TRUE.equals(row.get("accepted"));
                    if ("ASSIGNED".equals(dispatchFilter)) return assigned;
                    if ("WAITING".equals(dispatchFilter)) return !assigned;
                    return true;
                })
                .filter(row -> paymentFilter.isBlank() || paymentFilter.equals(String.valueOf(row.get("paymentStatus"))))
                .filter(row -> settlementFilter.isBlank() || settlementFilter.equals(String.valueOf(row.get("settlementStatus"))))
                .filter(row -> keyword.isBlank() || containsKeyword(
                        row,
                        keyword,
                        "matchId",
                        "quoteId",
                        "shipperName",
                        "cargoType",
                        "originAddress",
                        "destinationAddress",
                        "driverName",
                        "truckName"
                ))
                .toList();

        return paginate(filtered, p, s);
    }

    private Match.Status parseMatchStatus(String status) {
        if (status == null || status.isBlank()) return null;
        try {
            return Match.Status.valueOf(status);
        } catch (IllegalArgumentException e) {
            return null;
        }
    }

    private Boolean parseAcceptedFilter(String dispatchState) {
        if (dispatchState == null || dispatchState.isBlank()) return null;
        if ("ASSIGNED".equalsIgnoreCase(dispatchState)) return true;
        if ("WAITING".equalsIgnoreCase(dispatchState)) return false;
        return null;
    }

    /** 특정 매칭 리스트에 대한 스냅샷 빌드 (DB 페이지네이션용) */
    private List<DispatchSnapshot> buildDispatchSnapshotsForMatches(List<Match> matches) {
        if (matches.isEmpty()) {
            return List.of();
        }

        List<Long> matchIds = matches.stream()
                .map(Match::getMatchId)
                .filter(id -> id != null && id > 0)
                .toList();
        List<Long> quoteIds = matches.stream()
                .map(Match::getQuoteId)
                .filter(id -> id != null && id > 0)
                .distinct()
                .toList();
        List<Long> driverIds = matches.stream()
                .map(Match::getDriverId)
                .filter(id -> id != null && id > 0)
                .distinct()
                .toList();

        Map<Long, Quote> quoteMap = quoteRepository.findAllById(quoteIds).stream()
                .collect(Collectors.toMap(Quote::getQuoteId, quote -> quote, (left, right) -> left));
        Map<Long, Driver> driverMap = driverRepository.findAllById(driverIds).stream()
                .collect(Collectors.toMap(Driver::getDriverId, driver -> driver, (left, right) -> left));
        List<Long> shipperIds = quoteMap.values().stream()
                .map(Quote::getShipperId)
                .filter(id -> id != null && id > 0)
                .distinct()
                .toList();
        Map<Long, Shipper> shipperMap = shipperRepository.findAllById(shipperIds).stream()
                .collect(Collectors.toMap(Shipper::getShipperId, shipper -> shipper, (left, right) -> left));
        Map<Long, Truck> truckByDriver = pickTruckByDriver(driverIds);

        Map<Long, Settlement> settlementByMatch = settlementRepository.findByMatchIdIn(matchIds).stream()
                .collect(Collectors.toMap(Settlement::getMatchId, settlement -> settlement, (left, right) -> {
                    LocalDateTime leftTime = left.getUpdatedAt() == null ? LocalDateTime.MIN : left.getUpdatedAt();
                    LocalDateTime rightTime = right.getUpdatedAt() == null ? LocalDateTime.MIN : right.getUpdatedAt();
                    return leftTime.isAfter(rightTime) ? left : right;
                }));
        Map<Long, Payment> paymentByMatch = paymentRepository.findByMatchIdIn(matchIds).stream()
                .collect(Collectors.toMap(Payment::getMatchId, payment -> payment, (left, right) -> {
                    LocalDateTime leftTime = left.getCreatedAt() == null ? LocalDateTime.MIN : left.getCreatedAt();
                    LocalDateTime rightTime = right.getCreatedAt() == null ? LocalDateTime.MIN : right.getCreatedAt();
                    return leftTime.isAfter(rightTime) ? left : right;
                }));
        Map<Long, Long> unreadByMatch = fetchUnreadCountByMatch(matchIds);

        List<DispatchSnapshot> out = new ArrayList<>();
        for (Match match : matches) {
            Quote quote = quoteMap.get(match.getQuoteId());
            Driver driver = match.getDriverId() == null ? null : driverMap.get(match.getDriverId());
            Shipper shipper = quote == null ? null : shipperMap.get(quote.getShipperId());
            Truck truck = driver == null ? null : truckByDriver.get(driver.getDriverId());
            Settlement settlement = settlementByMatch.get(match.getMatchId());
            Payment payment = paymentByMatch.get(match.getMatchId());
            long unread = unreadByMatch.getOrDefault(match.getMatchId(), 0L);
            out.add(new DispatchSnapshot(match, quote, driver, shipper, truck, settlement, payment, unread));
        }
        return out;
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> listAssignableDrivers(String matchId) {
        Long matchNumericId = parseFlexibleId(matchId, "M");
        Match target = matchRepository.findById(matchNumericId)
                .orElseThrow(() -> new CustomException(ErrorCode.INVALID_REQUEST));

        List<Match> activeMatches = matchRepository.findByDriverIdIsNotNullAndStatusIn(
                List.of(Match.Status.READY, Match.Status.IN_TRANSIT)
        );

        List<Long> quoteIds = new ArrayList<>();
        quoteIds.add(target.getQuoteId());
        quoteIds.addAll(activeMatches.stream()
                .map(Match::getQuoteId)
                .filter(id -> id != null && id > 0)
                .toList());

        Map<Long, Quote> quoteById = quoteRepository.findAllById(quoteIds).stream()
                .collect(Collectors.toMap(Quote::getQuoteId, q -> q, (left, right) -> left));

        double targetVolume = Optional.ofNullable(quoteById.get(target.getQuoteId()))
                .map(Quote::getVolumeCbm)
                .map(Integer::doubleValue)
                .orElse(0.0);

        Map<Long, Double> currentVolumeByDriver = new LinkedHashMap<>();
        for (Match active : activeMatches) {
            Quote quote = quoteById.get(active.getQuoteId());
            if (quote == null) continue;
            double current = Optional.ofNullable(quote.getVolumeCbm()).map(Integer::doubleValue).orElse(0.0);
            currentVolumeByDriver.merge(active.getDriverId(), current, Double::sum);
        }

        List<Driver> activeDrivers = driverRepository.findByStatusIgnoreCase("ACTIVE");
        List<Long> activeDriverIds = activeDrivers.stream()
                .map(Driver::getDriverId)
                .filter(id -> id != null && id > 0)
                .toList();
        Map<Long, Truck> truckByDriver = pickTruckByDriver(activeDriverIds);

        return activeDrivers.stream()
                .map(driver -> {
                    Truck truck = truckByDriver.get(driver.getDriverId());
                    double maxVolume = truck == null || truck.getMaxVolume() == null ? 0.0 : truck.getMaxVolume().doubleValue();
                    double currentVolume = currentVolumeByDriver.getOrDefault(driver.getDriverId(), 0.0);
                    if (maxVolume > 0 && targetVolume > 0 && currentVolume + targetVolume > maxVolume) {
                        return null;
                    }
                    Map<String, Object> row = new LinkedHashMap<>();
                    row.put("driverId", formatId("D", driver.getDriverId()));
                    row.put("driverName", defaultText(driver.getName(), "기사"));
                    row.put("truckName", truck == null ? "차량 미등록" : defaultText(truck.getName(), defaultText(truck.getVehicleType(), "차량")));
                    row.put("maxVolumeCbm", round1(maxVolume));
                    row.put("currentVolumeCbm", round1(currentVolume));
                    return row;
                })
                .filter(row -> row != null)
                .toList();
    }

    @Transactional
    public Map<String, Object> forceAssign(String matchId, String driverId) {
        Long matchNumericId = parseFlexibleId(matchId, "M");
        Long driverNumericId = parseFlexibleId(driverId, "D");

        Match match = matchRepository.findById(matchNumericId)
                .orElseThrow(() -> new CustomException(ErrorCode.INVALID_REQUEST));
        if (match.getStatus() == Match.Status.CANCELLED || match.getStatus() == Match.Status.COMPLETED) {
            throw new CustomException(ErrorCode.INVALID_REQUEST);
        }

        Driver driver = driverRepository.findById(driverNumericId)
                .orElseThrow(() -> new CustomException(ErrorCode.INVALID_REQUEST));
        if (!"ACTIVE".equalsIgnoreCase(defaultText(driver.getStatus(), "ACTIVE"))) {
            throw new CustomException(ErrorCode.INVALID_REQUEST);
        }

        match.setDriverId(driverNumericId);
        match.setAccepted(true);
        match.setAcceptedAt(LocalDateTime.now());
        if (match.getStatus() == null) {
            match.setStatus(Match.Status.READY);
        }
        matchRepository.save(match);

        DispatchSnapshot snapshot = buildDispatchSnapshotsForMatches(List.of(match)).stream()
                .findFirst()
                .orElseThrow(() -> new CustomException(ErrorCode.INVALID_REQUEST));
        return toDispatchRow(snapshot);
    }

    private List<DispatchSnapshot> buildDispatchSnapshots() {
        int limit = resolveDispatchSnapshotLimit();
        List<Match> matches = matchRepository.findRecentMatches(PageRequest.of(0, limit)).stream()
                .sorted(Comparator.comparing(Match::getUpdatedAt, Comparator.nullsLast(Comparator.reverseOrder())))
                .toList();
        if (matches.isEmpty()) {
            return List.of();
        }

        List<Long> matchIds = matches.stream()
                .map(Match::getMatchId)
                .filter(id -> id != null && id > 0)
                .toList();
        List<Long> quoteIds = matches.stream()
                .map(Match::getQuoteId)
                .filter(id -> id != null && id > 0)
                .distinct()
                .toList();
        List<Long> driverIds = matches.stream()
                .map(Match::getDriverId)
                .filter(id -> id != null && id > 0)
                .distinct()
                .toList();

        Map<Long, Quote> quoteMap = quoteRepository.findAllById(quoteIds).stream()
                .collect(Collectors.toMap(Quote::getQuoteId, quote -> quote, (left, right) -> left));
        Map<Long, Driver> driverMap = driverRepository.findAllById(driverIds).stream()
                .collect(Collectors.toMap(Driver::getDriverId, driver -> driver, (left, right) -> left));
        List<Long> shipperIds = quoteMap.values().stream()
                .map(Quote::getShipperId)
                .filter(id -> id != null && id > 0)
                .distinct()
                .toList();
        Map<Long, Shipper> shipperMap = shipperRepository.findAllById(shipperIds).stream()
                .collect(Collectors.toMap(Shipper::getShipperId, shipper -> shipper, (left, right) -> left));
        Map<Long, Truck> truckByDriver = pickTruckByDriver(driverIds);

        Map<Long, Settlement> settlementByMatch = settlementRepository.findByMatchIdIn(matchIds).stream()
                .collect(Collectors.toMap(Settlement::getMatchId, settlement -> settlement, (left, right) -> {
                    LocalDateTime leftTime = left.getUpdatedAt() == null ? LocalDateTime.MIN : left.getUpdatedAt();
                    LocalDateTime rightTime = right.getUpdatedAt() == null ? LocalDateTime.MIN : right.getUpdatedAt();
                    return leftTime.isAfter(rightTime) ? left : right;
                }));
        Map<Long, Payment> paymentByMatch = paymentRepository.findByMatchIdIn(matchIds).stream()
                .collect(Collectors.toMap(Payment::getMatchId, payment -> payment, (left, right) -> {
                    LocalDateTime leftTime = left.getCreatedAt() == null ? LocalDateTime.MIN : left.getCreatedAt();
                    LocalDateTime rightTime = right.getCreatedAt() == null ? LocalDateTime.MIN : right.getCreatedAt();
                    return leftTime.isAfter(rightTime) ? left : right;
                }));
        Map<Long, Long> unreadByMatch = fetchUnreadCountByMatch(matchIds);

        List<DispatchSnapshot> out = new ArrayList<>();
        for (Match match : matches) {
            Quote quote = quoteMap.get(match.getQuoteId());
            Driver driver = match.getDriverId() == null ? null : driverMap.get(match.getDriverId());
            Shipper shipper = quote == null ? null : shipperMap.get(quote.getShipperId());
            Truck truck = driver == null ? null : truckByDriver.get(driver.getDriverId());
            Settlement settlement = settlementByMatch.get(match.getMatchId());
            Payment payment = paymentByMatch.get(match.getMatchId());
            long unread = unreadByMatch.getOrDefault(match.getMatchId(), 0L);
            out.add(new DispatchSnapshot(match, quote, driver, shipper, truck, settlement, payment, unread));
        }
        return out;
    }

    private int resolveDispatchSnapshotLimit() {
        return Math.max(50, Math.min(dispatchSnapshotLimit, 5000));
    }

    private Map<Long, Truck> pickTruckByDriver(List<Long> driverIds) {
        if (driverIds == null || driverIds.isEmpty()) {
            return Map.of();
        }
        List<Truck> trucks = truckRepository.findByDriverIdIn(driverIds);
        return trucks.stream()
                .collect(Collectors.groupingBy(Truck::getDriverId))
                .entrySet().stream()
                .collect(Collectors.toMap(
                        Map.Entry::getKey,
                        entry -> entry.getValue().stream()
                                .sorted(Comparator
                                        .comparing((Truck truck) -> Boolean.TRUE.equals(truck.getApproved())).reversed()
                                        .thenComparing(Truck::getUpdatedAt, Comparator.nullsLast(Comparator.reverseOrder())))
                                .findFirst()
                                .orElse(null)
                ));
    }

    private Map<Long, Long> fetchUnreadCountByMatch(List<Long> matchIds) {
        if (matchIds == null || matchIds.isEmpty()) {
            return Map.of();
        }
        Map<Long, Long> out = new LinkedHashMap<>();
        for (Object[] row : notificationRepository.countUnreadByMatchIds(matchIds)) {
            if (row == null || row.length < 2) {
                continue;
            }
            if (!(row[0] instanceof Number matchIdNumber) || !(row[1] instanceof Number countNumber)) {
                continue;
            }
            out.put(matchIdNumber.longValue(), countNumber.longValue());
        }
        return out;
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> listDriverApprovals() {
        List<Driver> pendingDrivers = driverRepository.findPendingApprovals();
        List<Long> driverIds = pendingDrivers.stream()
                .map(Driver::getDriverId)
                .filter(id -> id != null && id > 0)
                .toList();
        Map<Long, Truck> truckByDriver = pickTruckByDriver(driverIds);
        return pendingDrivers.stream()
                .map(driver -> {
                    Truck truck = truckByDriver.get(driver.getDriverId());
                    Map<String, Object> row = new LinkedHashMap<>();
                    row.put("driverId", formatId("D", driver.getDriverId()));
                    row.put("requestedAt", toText(driver.getCreatedAt()));
                    row.put("name", defaultText(driver.getName(), "기사"));
                    row.put("phone", defaultText(driver.getPhone(), "-"));
                    row.put("vehicleSummary", truck == null
                            ? "-"
                            : defaultText(truck.getVehicleType(), "차량") + " / " + defaultText(truck.getVehicleBodyType(), "-"));
                    row.put("licenseStatus", Boolean.TRUE.equals(driver.getLicenseVerified()) ? "VERIFIED" : "UNVERIFIED");
                    row.put("approvalStatus", "PENDING");
                    row.put("documents", List.of());
                    row.put("reviewMemo", null);
                    return row;
                })
                .toList();
    }

    @Transactional
    public void reviewDriverApproval(String driverId, String action, String reason) {
        Long driverNumericId = parseFlexibleId(driverId, "D");
        Driver driver = driverRepository.findById(driverNumericId)
                .orElseThrow(() -> new CustomException(ErrorCode.INVALID_REQUEST));
        String normalized = normalizeText(action).toUpperCase(Locale.ROOT);
        if ("APPROVE".equals(normalized)) {
            driver.reviewApproval(true, "ACTIVE");
        } else if ("REJECT".equals(normalized)) {
            driver.reviewApproval(false, "SUSPENDED");
        } else {
            throw new CustomException(ErrorCode.INVALID_REQUEST);
        }
        driverRepository.save(driver);
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> listTruckApprovals() {
        List<Truck> trucks = truckRepository.findPendingApprovals();
        List<Long> driverIds = trucks.stream()
                .map(Truck::getDriverId)
                .filter(id -> id != null && id > 0)
                .distinct()
                .toList();

        Map<Long, Driver> driverMap = driverRepository.findAllById(driverIds).stream()
                .collect(Collectors.toMap(Driver::getDriverId, d -> d, (left, right) -> left));

        return trucks.stream()
                .map(truck -> {
                    Driver driver = driverMap.get(truck.getDriverId());
                    Map<String, Object> row = new LinkedHashMap<>();
                    row.put("truckId", String.valueOf(truck.getTruckId()));
                    row.put("driverId", formatId("D", truck.getDriverId()));
                    row.put("driverName", driver == null ? "기사" : defaultText(driver.getName(), "기사"));
                    row.put("requestedAt", toText(truck.getCreatedAt()));
                    row.put("plateNumber", defaultText(truck.getName(), "TRUCK-" + truck.getTruckId()));
                    row.put("vehicleType", defaultText(truck.getVehicleType(), "트럭"));
                    row.put("capacity", truck.getMaxWeight() == null ? 0 : truck.getMaxWeight().intValue());
                    row.put("manufacturingYear", resolveYear(truck.getLastInspectionDate()));
                    row.put("insuranceStatus", normalizeText(truck.getInsurance()).isBlank() ? "UNVERIFIED" : "VERIFIED");
                    row.put("approvalStatus", normalizeTruckApprovalStatus(truck));
                    row.put("documents", List.of());
                    row.put("reviewMemo", truck.getReviewMemo());
                    return row;
                })
                .toList();
    }

    @Transactional
    public void reviewTruckApproval(String truckId, String action, String reason) {
        Long truckNumericId = parseFlexibleId(truckId, "T");
        Truck truck = truckRepository.findById(truckNumericId)
                .orElseThrow(() -> new CustomException(ErrorCode.INVALID_REQUEST));

        String normalized = normalizeText(action).toUpperCase(Locale.ROOT);
        if ("APPROVE".equals(normalized)) {
            truck.reviewForAdmin(true, null);
        } else if ("REJECT".equals(normalized)) {
            truck.reviewForAdmin(false, normalizeText(reason));
        } else {
            throw new CustomException(ErrorCode.INVALID_REQUEST);
        }
        truckRepository.save(truck);
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> listSettlementApprovals() {
        return settlementRepository.findPendingOrNullBySettlementStatus(
                        Settlement.SettlementStatus.PENDING,
                        PageRequest.of(0, ACTIVITY_SOURCE_LIMIT)
                ).stream()
                .map(this::toSettlementApprovalRow)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> listSettlementApprovalHistory() {
        return settlementRepository.findNotStatusOrderByCreatedAtDesc(
                        Settlement.SettlementStatus.PENDING,
                        PageRequest.of(0, ACTIVITY_SOURCE_LIMIT)
                ).stream()
                .map(this::toSettlementApprovalRow)
                .toList();
    }

    @Transactional
    public void reviewSettlement(String settlementId, String action, String reason) {
        Long numericId = parseFlexibleId(settlementId, "SET");
        Settlement settlement = settlementRepository.findById(numericId)
                .orElseThrow(() -> new CustomException(ErrorCode.INVALID_REQUEST));

        String normalized = normalizeText(action).toUpperCase(Locale.ROOT);
        if ("APPROVE".equals(normalized)) {
            settlement.setSettlementStatus(Settlement.SettlementStatus.COMPLETED);
            settlement.setCompletedAt(LocalDateTime.now());
            settlement.setReviewMemo(normalizeText(reason).isBlank() ? "관리자 승인" : normalizeText(reason));
        } else if ("REJECT".equals(normalized)) {
            settlement.setSettlementStatus(Settlement.SettlementStatus.FAILED);
            settlement.setCompletedAt(LocalDateTime.now());
            settlement.setReviewMemo(normalizeText(reason));
        } else {
            throw new CustomException(ErrorCode.INVALID_REQUEST);
        }
        settlementRepository.save(settlement);
    }

    @Transactional
    public Map<String, Object> updateQuote(String quoteId, AdminQuoteUpdateRequest request) {
        String idSource = normalizeText(quoteId);
        if (idSource.isBlank() && request != null) {
            idSource = normalizeText(request.getQuoteId());
        }
        Long numericId = parseFlexibleId(idSource, "Q");

        Quote quote = quoteRepository.findById(numericId)
                .orElseThrow(() -> new CustomException(ErrorCode.INVALID_REQUEST));

        quote.updateByAdmin(
                normalizeQuoteStatus(request == null ? null : request.getStatus(), quote.getStatus()),
                request == null ? null : normalizeText(request.getCargoType()),
                request == null ? null : request.getDesiredPrice(),
                request == null ? null : request.getFinalPrice(),
                request == null ? null : request.getDistanceKm(),
                request == null ? null : request.getWeightKg(),
                request == null ? null : request.getVolumeCbm(),
                request == null ? null : normalizeText(request.getOriginAddress()),
                request == null ? null : normalizeText(request.getDestinationAddress()),
                request == null ? null : request.getAllowCombine(),
                request == null ? null : normalizeText(request.getLoadMethod()),
                request == null ? null : normalizeText(request.getUnloadMethod()),
                parseDateTime(request == null ? null : request.getDeadlineAt(), quote.getDeliverySchedule()),
                request == null ? null : request.getChecklistSummary()
        );
        quoteRepository.save(quote);

        Map<Long, String> shipperNameMap = new LinkedHashMap<>();
        if (quote.getShipperId() != null) {
            shipperRepository.findById(quote.getShipperId())
                    .ifPresent(shipper -> shipperNameMap.put(
                            shipper.getShipperId(),
                            defaultText(shipper.getName(), "화주")
                    ));
        }
        return toQuoteRow(quote, shipperNameMap);
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> listVehiclePricingRows() {
        return pricingRateCatalogRepository.findAllByOrderByVehicleTypeAscMinDistanceKmAsc(
                        PageRequest.of(0, REFERENCE_CATALOG_LIMIT)
                ).stream()
                .map(this::toVehiclePricingRow)
                .toList();
    }

    @Transactional
    public Map<String, Object> updateVehiclePricing(String pricingId, AdminPricingVehicleUpdateRequest request) {
        Long numericId = parseFlexibleId(pricingId, "VP");
        PricingRateCatalog row = pricingRateCatalogRepository.findById(numericId)
                .orElseThrow(() -> new CustomException(ErrorCode.INVALID_REQUEST));
        row.updateByAdmin(
                request == null ? null : request.getBaseFare(),
                request == null ? null : request.getAdditionalFare(),
                request == null || request.getSurchargeRate() == null ? null : BigDecimal.valueOf(request.getSurchargeRate()),
                request == null ? null : request.getActive(),
                "admin"
        );
        pricingRateCatalogRepository.save(row);
        return toVehiclePricingRow(row);
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> listAdditionalPricingRows() {
        return surchargeOptionRepository.findAllByOrderByCodeAsc(
                        PageRequest.of(0, REFERENCE_CATALOG_LIMIT)
                ).stream()
                .map(this::toAdditionalPricingRow)
                .toList();
    }

    @Transactional
    public Map<String, Object> updateAdditionalPricing(String pricingId, AdminPricingAdditionalUpdateRequest request) {
        Long numericId = parseFlexibleId(pricingId, "AP");
        SurchargeOptionEntity option = surchargeOptionRepository.findById(numericId)
                .orElseThrow(() -> new CustomException(ErrorCode.INVALID_REQUEST));
        option.updateByAdmin(
                request == null ? null : request.getAdditionalFare(),
                request == null || request.getRateDelta() == null ? null : BigDecimal.valueOf(request.getRateDelta()),
                request == null ? null : request.getActive()
        );
        surchargeOptionRepository.save(option);
        return toAdditionalPricingRow(option);
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> listTruckSpecRows() {
        return truckSpecCatalogRepository.findAllByOrderByVehicleTypeAscVehicleBodyTypeAsc(
                        PageRequest.of(0, REFERENCE_CATALOG_LIMIT)
                ).stream()
                .map(this::toTruckSpecRow)
                .toList();
    }

    @Transactional
    public Map<String, Object> updateTruckSpec(String specId, AdminTruckSpecUpdateRequest request) {
        Long numericId = parseFlexibleId(specId, "TS");
        TruckSpecCatalog row = truckSpecCatalogRepository.findById(numericId)
                .orElseThrow(() -> new CustomException(ErrorCode.INVALID_REQUEST));

        BigDecimal tonnage = request == null || request.getTonnage() == null
                ? row.getTonnage()
                : BigDecimal.valueOf(request.getTonnage());
        BigDecimal maxWeight = request == null || request.getMaxWeight() == null
                ? row.getMaxWeight()
                : BigDecimal.valueOf(request.getMaxWeight());
        BigDecimal maxVolume = request == null || request.getMaxVolume() == null
                ? row.getMaxVolume()
                : BigDecimal.valueOf(request.getMaxVolume());
        BigDecimal cargoLengthCm = request == null || request.getCargoLengthCm() == null
                ? BigDecimal.valueOf(row.getCargoLengthCm() == null ? 0 : row.getCargoLengthCm())
                : BigDecimal.valueOf(request.getCargoLengthCm());
        BigDecimal cargoWidthCm = request == null || request.getCargoWidthCm() == null
                ? BigDecimal.valueOf(row.getCargoWidthCm() == null ? 0 : row.getCargoWidthCm())
                : BigDecimal.valueOf(request.getCargoWidthCm());
        BigDecimal cargoHeightCm = request == null || request.getCargoHeightCm() == null
                ? BigDecimal.valueOf(row.getCargoHeightCm() == null ? 0 : row.getCargoHeightCm())
                : BigDecimal.valueOf(request.getCargoHeightCm());

        row.applyStandardData(
                defaultText(request == null ? null : request.getVehicleTypeKr(), row.getVehicleTypeKr()),
                defaultText(request == null ? null : request.getCategoryKr(), row.getCategoryKr()),
                defaultText(request == null ? null : request.getVehicleModel(), row.getVehicleModel()),
                tonnage,
                maxWeight,
                defaultText(request == null ? null : request.getMaxWeightDisplay(), row.getMaxWeightDisplay()),
                maxVolume,
                cargoLengthCm,
                cargoWidthCm,
                cargoHeightCm,
                request == null || request.getPalletCount() == null ? row.getPalletCount() : request.getPalletCount(),
                defaultText(request == null ? null : request.getPalletStandardMm(), row.getPalletStandardMm()),
                defaultText(request == null ? null : request.getDoorPosition(), row.getDoorPosition()),
                defaultText(request == null ? null : request.getSourceName(), row.getSourceName())
        );
        truckSpecCatalogRepository.save(row);
        return toTruckSpecRow(row);
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> listActivityLogs() {
        List<Map<String, Object>> logs = new ArrayList<>();

        for (SanctionEvent event : sanctionEventRepository.findAllByOrderByCreatedAtDesc(
                PageRequest.of(0, ACTIVITY_SOURCE_LIMIT)
        )) {
            Map<String, Object> row = new LinkedHashMap<>();
            row.put("id", "SAN-" + event.getSanctionId());
            row.put("timestamp", toText(event.getCreatedAt()));
            row.put("action", "SANCTION_" + defaultText(event.getType(), "UPDATED"));
            row.put("targetId", defaultText(event.getTargetId(), "-"));
            row.put("mode", "REAL");
            row.put("message", defaultText(event.getReason(), "제재 기록"));
            logs.add(row);
        }

        List<Settlement> reviewedSettlements = settlementRepository.findNotStatusOrderByCreatedAtDesc(
                Settlement.SettlementStatus.PENDING,
                PageRequest.of(0, ACTIVITY_SOURCE_LIMIT)
        );
        for (Settlement settlement : reviewedSettlements) {
            if (normalizeText(settlement.getReviewMemo()).isBlank()) continue;
            Map<String, Object> row = new LinkedHashMap<>();
            row.put("id", "SET-" + settlement.getSettlementId());
            row.put("timestamp", toText(settlement.getUpdatedAt()));
            row.put("action", "SETTLEMENT_REVIEWED");
            row.put("targetId", "SET-" + settlement.getSettlementId());
            row.put("mode", "REAL");
            row.put("message", settlement.getReviewMemo());
            logs.add(row);
        }

        logs.sort((left, right) -> String.valueOf(right.get("timestamp")).compareTo(String.valueOf(left.get("timestamp"))));
        return logs.stream().limit(200).toList();
    }

    private Map<String, Object> toDeliveryHistoryRow(DispatchSnapshot snapshot) {
        Quote quote = snapshot.quote();
        Settlement settlement = snapshot.settlement();
        Map<String, Object> row = new LinkedHashMap<>();
        row.put("matchId", formatId("M", snapshot.match().getMatchId()));
        row.put("quoteId", formatId("Q", quote.getQuoteId()));
        row.put("shipperName", snapshot.shipper() == null ? "화주" : defaultText(snapshot.shipper().getName(), "화주"));
        row.put("driverName", snapshot.driver() == null ? "미배정" : defaultText(snapshot.driver().getName(), "기사"));
        row.put("originAddress", defaultText(quote.getOriginAddress(), "-"));
        row.put("destinationAddress", defaultText(quote.getDestinationAddress(), "-"));
        row.put("departAt", toText(snapshot.match().getAcceptedAt() == null ? snapshot.match().getCreatedAt() : snapshot.match().getAcceptedAt()));
        row.put("arriveAt", snapshot.match().getStatus() == Match.Status.COMPLETED ? toText(snapshot.match().getUpdatedAt()) : null);
        row.put("matchStatus", snapshot.match().getStatus().name());
        row.put("settlementStatus", settlement == null ? "PENDING" : settlement.getSettlementStatus().name());
        row.put("totalFare", settlement == null ? toInt(quote.getFinalPrice()) : toInt(settlement.getTotalFare()));
        row.put("driverPayout", settlement == null ? Math.max(0, (int) Math.round(toInt(quote.getFinalPrice()) * 0.85)) : toInt(settlement.getDriverPayout()));
        return row;
    }

    private Map<String, Object> toLiveDeliveryRow(DispatchSnapshot snapshot) {
        Quote quote = snapshot.quote();
        List<GpsLog> recentLogs = findRecentGpsLogs(snapshot.match().getMatchId(), 1);
        GpsLog latest = recentLogs.isEmpty() ? null : recentLogs.get(0);
        int progress = resolveLiveProgress(snapshot.match(), quote, latest);

        double currentLat = latest != null && latest.getLat() != null
                ? latest.getLat().doubleValue()
                : quote.getOriginLat() == null ? 0.0 : quote.getOriginLat();
        double currentLng = latest != null && latest.getLng() != null
                ? latest.getLng().doubleValue()
                : quote.getOriginLng() == null ? 0.0 : quote.getOriginLng();
        double speedKmh = latest != null && latest.getSpeedKmh() != null
                ? latest.getSpeedKmh().doubleValue()
                : 0.0;
        double deviationDistanceKm = isDeviation(latest) && latest.getDeviationDistanceM() != null
                ? Math.round((latest.getDeviationDistanceM() / 1000.0) * 100.0) / 100.0
                : 0.0;

        Map<String, Object> row = new LinkedHashMap<>();
        row.put("matchId", formatId("M", snapshot.match().getMatchId()));
        row.put("quoteId", formatId("Q", quote.getQuoteId()));
        row.put("driverId", snapshot.driver() == null ? "-" : formatId("D", snapshot.driver().getDriverId()));
        row.put("driverName", snapshot.driver() == null ? "미배정" : defaultText(snapshot.driver().getName(), "기사"));
        row.put("shipperName", snapshot.shipper() == null ? "화주" : defaultText(snapshot.shipper().getName(), "화주"));
        row.put("originAddress", defaultText(quote.getOriginAddress(), "-"));
        row.put("destinationAddress", defaultText(quote.getDestinationAddress(), "-"));
        row.put("currentLat", currentLat);
        row.put("currentLng", currentLng);
        row.put("speedKmh", speedKmh);
        row.put("progressPercent", progress);
        row.put("deviationDistanceKm", deviationDistanceKm);
        row.put("routeUpdatedAt", toText(latest == null ? snapshot.match().getUpdatedAt() : latest.getLoggedAt()));
        row.put("liveStatus", resolveLiveStatus(snapshot.match(), latest, deviationDistanceKm));
        return row;
    }

    private Map<String, Object> toDispatchRow(DispatchSnapshot snapshot) {
        Quote quote = snapshot.quote();
        Settlement settlement = snapshot.settlement();
        Payment payment = snapshot.payment();
        Truck truck = snapshot.truck();

        int totalFare = settlement == null ? toInt(quote.getFinalPrice()) : toInt(settlement.getTotalFare());
        int driverPayout = settlement == null ? Math.max(0, (int) Math.round(totalFare * 0.85)) : toInt(settlement.getDriverPayout());
        int platformFee = settlement == null ? Math.max(0, totalFare - driverPayout) : toInt(settlement.getPlatformFee());
        double currentVolume = quote.getVolumeCbm() == null ? 0.0 : quote.getVolumeCbm();
        double maxVolume = truck == null || truck.getMaxVolume() == null ? currentVolume : truck.getMaxVolume().doubleValue();
        double remainingVolume = Math.max(0.0, maxVolume - currentVolume);

        Map<String, Object> row = new LinkedHashMap<>();
        row.put("matchId", formatId("M", snapshot.match().getMatchId()));
        row.put("quoteId", formatId("Q", quote.getQuoteId()));
        row.put("shipperName", snapshot.shipper() == null ? "화주" : defaultText(snapshot.shipper().getName(), "화주"));
        row.put("cargoType", defaultText(quote.getCargoType(), defaultText(quote.getCargoName(), "-")));
        row.put("originAddress", defaultText(quote.getOriginAddress(), "-"));
        row.put("destinationAddress", defaultText(quote.getDestinationAddress(), "-"));
        row.put("requestedAt", toText(quote.getCreatedAt()));
        row.put("departAt", toText(snapshot.match().getAcceptedAt()));
        row.put("arriveAt", snapshot.match().getStatus() == Match.Status.COMPLETED ? toText(snapshot.match().getUpdatedAt()) : null);
        row.put("driverName", snapshot.driver() == null ? null : defaultText(snapshot.driver().getName(), "기사"));
        row.put("truckName", truck == null ? null : defaultText(truck.getName(), defaultText(truck.getVehicleType(), "트럭")));
        row.put("matchStatus", snapshot.match().getStatus().name());
        row.put("accepted", Boolean.TRUE.equals(snapshot.match().getAccepted()));
        row.put("currentVolumeCbm", round1(currentVolume));
        row.put("remainingVolumeCbm", round1(remainingVolume));
        row.put("routeDistanceKm", toInt(quote.getDistanceKm()));
        row.put("totalFare", totalFare);
        row.put("driverPayout", driverPayout);
        row.put("platformFee", platformFee);
        row.put("paymentStatus", payment == null || payment.getStatus() == null ? "PENDING" : payment.getStatus().name());
        row.put("settlementStatus", settlement == null || settlement.getSettlementStatus() == null ? "PENDING" : settlement.getSettlementStatus().name());
        row.put("unreadNotificationCount", (int) snapshot.unreadCount());
        row.put("deviationSeverity", "NONE");
        return row;
    }

    private Map<String, Object> toSettlementApprovalRow(Settlement settlement) {
        Driver driver = driverRepository.findById(settlement.getDriverId()).orElse(null);
        Shipper shipper = shipperRepository.findById(settlement.getShipperId()).orElse(null);
        Map<String, Object> row = new LinkedHashMap<>();
        row.put("settlementId", "SET-" + settlement.getSettlementId());
        row.put("matchId", formatId("M", settlement.getMatchId()));
        row.put("driverId", formatId("D", settlement.getDriverId()));
        row.put("driverName", driver == null ? "기사" : defaultText(driver.getName(), "기사"));
        row.put("shipperName", shipper == null ? "화주" : defaultText(shipper.getName(), "화주"));
        row.put("dueDate", settlement.getDueDate() == null ? "-" : settlement.getDueDate().toString());
        row.put("totalFare", toInt(settlement.getTotalFare()));
        row.put("driverPayout", toInt(settlement.getDriverPayout()));
        row.put("settlementStatus", settlement.getSettlementStatus() == null ? "PENDING" : settlement.getSettlementStatus().name());
        row.put("approvalStatus", resolveApprovalStatus(settlement));
        row.put("reviewMemo", settlement.getReviewMemo());
        return row;
    }

    private Map<String, Object> toQuoteRow(Quote quote, Map<Long, String> shipperNameMap) {
        Map<String, Object> row = new LinkedHashMap<>();
        row.put("quoteId", formatId("Q", quote.getQuoteId()));
        row.put("shipperName", shipperNameMap.getOrDefault(quote.getShipperId(), "화주"));
        row.put("originAddress", defaultText(quote.getOriginAddress(), "-"));
        row.put("destinationAddress", defaultText(quote.getDestinationAddress(), "-"));
        row.put("distanceKm", toInt(quote.getDistanceKm()));
        row.put("weightKg", toInt(quote.getWeightKg()));
        row.put("volumeCbm", toInt(quote.getVolumeCbm()));
        row.put("cargoType", defaultText(quote.getCargoType(), defaultText(quote.getCargoName(), "-")));
        row.put("desiredPrice", toInt(quote.getDesiredPrice()));
        row.put("finalPrice", quote.getFinalPrice());
        row.put("status", normalizeQuoteStatus(quote.getStatus(), "OPEN"));
        row.put("allowCombine", Boolean.TRUE.equals(quote.getAllowCombine()));
        row.put("loadMethod", "DRIVER".equalsIgnoreCase(quote.getLoadMethod()) ? "DRIVER" : "SHIPPER");
        row.put("unloadMethod", "DRIVER".equalsIgnoreCase(quote.getUnloadMethod()) ? "DRIVER" : "SHIPPER");
        row.put("deadlineAt", quote.getDeliverySchedule() == null ? null : quote.getDeliverySchedule().toString());
        row.put("checklistSummary", defaultText(quote.getCargoDesc(), ""));
        row.put("createdAt", toText(quote.getCreatedAt()));
        row.put("updatedAt", toText(quote.getUpdatedAt()));
        return row;
    }

    private Map<String, Object> toVehiclePricingRow(PricingRateCatalog row) {
        Map<String, Object> mapped = new LinkedHashMap<>();
        mapped.put("vehiclePricingId", String.valueOf(row.getRateId()));
        mapped.put("vehicleType", defaultText(row.getVehicleType(), ""));
        mapped.put("tonnageLabel", mapVehicleTypeToTonnage(row.getVehicleType()));
        mapped.put("bodyType", mapVehicleTypeToBodyType(row.getVehicleType()));
        mapped.put("rangeKey", defaultText(row.getRangeKey(), ""));
        mapped.put("minDistanceKm", row.getMinDistanceKm() == null ? 0 : row.getMinDistanceKm());
        mapped.put("maxDistanceKm", row.getMaxDistanceKm() == null ? 0 : row.getMaxDistanceKm());
        mapped.put("rangeLabel", formatRangeLabel(row.getMinDistanceKm(), row.getMaxDistanceKm()));
        mapped.put("baseFare", toInt(row.getBaseRateWon()));
        mapped.put("additionalFare", toInt(row.getAdditionalFareWon()));
        mapped.put("surchargeRate", row.getSurchargeRate() == null ? 0.0 : row.getSurchargeRate().doubleValue());
        mapped.put("active", !Boolean.FALSE.equals(row.getActive()));
        mapped.put("updatedBy", defaultText(row.getUpdatedBy(), defaultText(row.getSourceName(), "system")));
        mapped.put("updatedAt", toText(row.getUpdatedAt()));
        return mapped;
    }

    private static String formatRangeLabel(Integer minKm, Integer maxKm) {
        if (minKm == null && maxKm == null) return "-";
        int min = minKm == null ? 0 : minKm;
        int max = maxKm == null ? 0 : maxKm;
        if (min <= 0 && max <= 0) return "-";
        return min + "~" + max + "km";
    }

    private Map<String, Object> toAdditionalPricingRow(SurchargeOptionEntity option) {
        int additionalFare = 0;
        if (option.getFixedAddWon() != null) {
            additionalFare = option.getFixedAddWon().intValue();
        } else if (option.getMinAddWon() != null) {
            additionalFare = option.getMinAddWon().intValue();
        }
        double rateDelta = 0.0;
        if (option.getMinMultiplier() != null) {
            rateDelta = option.getMinMultiplier().subtract(BigDecimal.ONE).doubleValue();
        }

        Map<String, Object> row = new LinkedHashMap<>();
        row.put("additionalPricingId", String.valueOf(option.getId()));
        row.put("scope", mapScope(option.getOptionType(), option.getCode()));
        row.put("optionName", defaultText(option.getCode(), "옵션"));
        row.put("additionalFare", additionalFare);
        row.put("rateDelta", rateDelta);
        row.put("active", !Boolean.FALSE.equals(option.getEnabled()));
        row.put("updatedBy", "admin");
        row.put("updatedAt", toText(option.getUpdatedAt()));
        return row;
    }

    private Map<String, Object> toTruckSpecRow(TruckSpecCatalog row) {
        Map<String, Object> mapped = new LinkedHashMap<>();
        mapped.put("specId", row.getSpecId() == null ? null : "TS-" + row.getSpecId());
        mapped.put("vehicleType", defaultText(row.getVehicleType(), "-"));
        mapped.put("vehicleTypeKr", defaultText(row.getVehicleTypeKr(), row.getVehicleType()));
        mapped.put("vehicleBodyType", defaultText(row.getVehicleBodyType(), "-"));
        mapped.put("categoryKr", defaultText(row.getCategoryKr(), row.getVehicleBodyType()));
        mapped.put("vehicleModel", defaultText(row.getVehicleModel(), "-"));
        mapped.put("tonnage", row.getTonnage() == null ? 0.0 : row.getTonnage().doubleValue());
        mapped.put("maxWeight", toInt(row.getMaxWeight()));
        mapped.put("maxWeightDisplay", defaultText(row.getMaxWeightDisplay(), "-"));
        mapped.put("maxVolume", toInt(row.getMaxVolume()));
        mapped.put("cargoLengthCm", row.getCargoLengthCm() == null ? 0 : row.getCargoLengthCm());
        mapped.put("cargoWidthCm", row.getCargoWidthCm() == null ? 0 : row.getCargoWidthCm());
        mapped.put("cargoHeightCm", row.getCargoHeightCm() == null ? 0 : row.getCargoHeightCm());
        mapped.put("palletCount", row.getPalletCount() == null ? 0 : row.getPalletCount());
        mapped.put("palletStandardMm", defaultText(row.getPalletStandardMm(), "-"));
        mapped.put("doorPosition", defaultText(row.getDoorPosition(), "-"));
        mapped.put("sourceName", defaultText(row.getSourceName(), "-"));
        return mapped;
    }

    private static Map<String, Object> paginate(List<Map<String, Object>> rows, Integer page, Integer size) {
        int p = page == null || page < 1 ? 1 : page;
        int s = size == null || size < 1 ? 20 : size;
        int total = rows.size();
        int from = Math.min((p - 1) * s, total);
        int to = Math.min(from + s, total);
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("items", rows.subList(from, to));
        out.put("total", total);
        return out;
    }

    private static boolean containsKeyword(Map<String, Object> row, String keyword, String... fields) {
        if (keyword == null || keyword.isBlank()) return true;
        StringBuilder joined = new StringBuilder();
        for (String field : fields) {
            Object value = row.get(field);
            if (value != null) {
                joined.append(' ').append(value);
            }
        }
        return joined.toString().toLowerCase(Locale.ROOT).contains(keyword);
    }

    private static String resolveApprovalStatus(Settlement settlement) {
        if (settlement.getSettlementStatus() == null) return "PENDING";
        if (settlement.getSettlementStatus() == Settlement.SettlementStatus.COMPLETED) return "APPROVED";
        if (settlement.getSettlementStatus() == Settlement.SettlementStatus.FAILED) return "REJECTED";
        return "PENDING";
    }

    private static String normalizeQuoteStatus(String value, String fallback) {
        String status = normalizeText(value).toUpperCase(Locale.ROOT);
        if ("DRAFT".equals(status)) return "DRAFT";
        if ("OPEN".equals(status)) return "OPEN";
        if ("MATCHED".equals(status)) return "MATCHED";
        if ("CANCELLED".equals(status)) return "CANCELLED";
        if ("IN_TRANSIT".equals(status) || "DELIVERED".equals(status) || "COMPLETED".equals(status)) return "MATCHED";
        return normalizeText(fallback).isBlank() ? "OPEN" : normalizeText(fallback).toUpperCase(Locale.ROOT);
    }

    private static String normalizeTruckApprovalStatus(Truck truck) {
        String status = normalizeText(truck.getApprovalStatus()).toUpperCase(Locale.ROOT);
        if ("APPROVED".equals(status) || "REJECTED".equals(status) || "PENDING".equals(status)) {
            return status;
        }
        return Boolean.TRUE.equals(truck.getApproved()) ? "APPROVED" : "PENDING";
    }

    private static int resolveYear(LocalDate date) {
        if (date != null) return date.getYear();
        return LocalDate.now().getYear();
    }

    private List<GpsLog> findRecentGpsLogs(Long matchId, int limit) {
        if (matchId == null || limit <= 0) {
            return List.of();
        }
        int pageSize = Math.max(1, Math.min(limit, LIVE_ROUTE_POINT_LIMIT));
        return gpsLogRepository.findByMatchIdOrderByLoggedAtDesc(matchId, PageRequest.of(0, pageSize));
    }

    private List<Map<String, Object>> buildPlannedRoute(Quote quote) {
        if (quote == null) {
            return List.of();
        }
        List<Map<String, Object>> points = new ArrayList<>();
        points.add(point(quote.getOriginLat(), quote.getOriginLng(), quote.getCreatedAt()));

        if (quote.getQuoteId() != null) {
            List<QuoteStop> stops = quoteStopRepository.findByQuoteIdOrderBySeqAsc(quote.getQuoteId());
            for (QuoteStop stop : stops) {
                if (stop.getLat() == null || stop.getLng() == null) {
                    continue;
                }
                points.add(point(stop.getLat(), stop.getLng(), stop.getCreatedAt()));
            }
        }

        points.add(point(quote.getDestinationLat(), quote.getDestinationLng(), resolveQuoteScheduleTime(quote)));
        return points;
    }

    private List<Map<String, Object>> buildCurrentRoute(Match match, Quote quote, List<GpsLog> recentLogs) {
        if (recentLogs != null && !recentLogs.isEmpty()) {
            List<Map<String, Object>> route = new ArrayList<>();
            for (int i = recentLogs.size() - 1; i >= 0; i--) {
                GpsLog log = recentLogs.get(i);
                route.add(point(
                        log.getLat() == null ? null : log.getLat().doubleValue(),
                        log.getLng() == null ? null : log.getLng().doubleValue(),
                        log.getLoggedAt()
                ));
            }
            return route;
        }

        List<Map<String, Object>> fallback = new ArrayList<>();
        fallback.add(point(quote.getOriginLat(), quote.getOriginLng(), quote.getCreatedAt()));
        if (match != null && match.getStatus() == Match.Status.COMPLETED) {
            fallback.add(point(quote.getDestinationLat(), quote.getDestinationLng(), match.getUpdatedAt()));
        }
        return fallback;
    }

    private int resolveLiveProgress(Match match, Quote quote, GpsLog latest) {
        if (match == null || quote == null) {
            return 0;
        }
        if (match.getStatus() == Match.Status.COMPLETED) {
            return 100;
        }
        if (match.getStatus() != Match.Status.IN_TRANSIT) {
            return toProgress(match.getStatus());
        }
        if (latest == null || latest.getLat() == null || latest.getLng() == null) {
            return 50;
        }
        if (quote.getOriginLat() == null || quote.getOriginLng() == null || quote.getDestinationLat() == null || quote.getDestinationLng() == null) {
            return 50;
        }

        double totalKm = haversineKm(quote.getOriginLat(), quote.getOriginLng(), quote.getDestinationLat(), quote.getDestinationLng());
        if (totalKm <= 0.01) {
            return 50;
        }
        double remainingKm = haversineKm(
                latest.getLat().doubleValue(),
                latest.getLng().doubleValue(),
                quote.getDestinationLat(),
                quote.getDestinationLng()
        );
        double progressedKm = Math.max(0.0, totalKm - remainingKm);
        int progress = (int) Math.round((progressedKm / totalKm) * 100.0);
        if (progress <= 0) return 1;
        if (progress >= 100) return 99;
        return progress;
    }

    private String resolveLiveStatus(Match match, GpsLog latest, double deviationDistanceKm) {
        if (isDeviation(latest) || deviationDistanceKm > 0.1) {
            return "DEVIATED";
        }
        if (match != null && match.getStatus() == Match.Status.IN_TRANSIT) {
            if (latest == null || latest.getLoggedAt() == null || latest.getLoggedAt().isBefore(LocalDateTime.now().minusMinutes(LIVE_DELAY_MINUTES))) {
                return "DELAYED";
            }
        }
        return "NORMAL";
    }

    private boolean isDeviation(GpsLog latest) {
        return latest != null && Boolean.TRUE.equals(latest.getIsDeviation());
    }

    private LocalDateTime resolveQuoteScheduleTime(Quote quote) {
        if (quote == null) {
            return null;
        }
        if (quote.getDeliveryDeadline() != null) {
            return quote.getDeliveryDeadline();
        }
        return quote.getDeliverySchedule();
    }

    private double haversineKm(double lat1, double lng1, double lat2, double lng2) {
        final double r = 6371.0;
        double dLat = Math.toRadians(lat2 - lat1);
        double dLng = Math.toRadians(lng2 - lng1);
        double a = Math.sin(dLat / 2) * Math.sin(dLat / 2)
                + Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2))
                * Math.sin(dLng / 2) * Math.sin(dLng / 2);
        double c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return r * c;
    }

    private static int toProgress(Match.Status status) {
        if (status == null) return 0;
        return switch (status) {
            case READY -> 0;
            case IN_TRANSIT -> 50;
            case COMPLETED -> 100;
            case CANCELLED -> 0;
        };
    }

    private static Map<String, Object> point(Double lat, Double lng, LocalDateTime recordedAt) {
        Map<String, Object> point = new LinkedHashMap<>();
        point.put("lat", lat == null ? 0.0 : lat);
        point.put("lng", lng == null ? 0.0 : lng);
        point.put("recordedAt", toText(recordedAt));
        return point;
    }

    private static Map<String, Object> timelineEvent(String id, String label, LocalDateTime occurredAt, String note) {
        Map<String, Object> event = new LinkedHashMap<>();
        event.put("id", id);
        event.put("label", label);
        event.put("occurredAt", toText(occurredAt));
        event.put("note", note);
        return event;
    }

    private static LocalDateTime parseDateTime(String raw, LocalDateTime fallback) {
        String value = normalizeText(raw);
        if (value.isBlank()) return fallback;
        try {
            return LocalDateTime.parse(value);
        } catch (DateTimeParseException ignored) {
            return fallback;
        }
    }

    private static Long parseFlexibleId(String raw, String expectedPrefix) {
        String value = normalizeText(raw);
        if (value.isBlank()) {
            throw new CustomException(ErrorCode.INVALID_REQUEST);
        }
        if (expectedPrefix != null && !expectedPrefix.isBlank()) {
            String normalizedPrefix = expectedPrefix.toUpperCase(Locale.ROOT) + "-";
            if (value.toUpperCase(Locale.ROOT).startsWith(normalizedPrefix)) {
                value = value.substring(normalizedPrefix.length());
            }
        }
        value = value.replaceAll("[^0-9]", "");
        if (value.isBlank()) {
            throw new CustomException(ErrorCode.INVALID_REQUEST);
        }
        try {
            return Long.parseLong(value);
        } catch (NumberFormatException e) {
            throw new CustomException(ErrorCode.INVALID_REQUEST);
        }
    }

    private static String formatId(String prefix, Long id) {
        if (id == null) return "-";
        return prefix + "-" + id;
    }

    private static String normalizeText(String value) {
        return value == null ? "" : value.trim();
    }

    private static String defaultText(String value, String fallback) {
        return normalizeText(value).isBlank() ? fallback : value.trim();
    }

    private static String defaultText(Object value, String fallback) {
        if (value == null) {
            return fallback;
        }
        String text = String.valueOf(value).trim();
        return text.isBlank() ? fallback : text;
    }

    private static String toText(LocalDateTime value) {
        return value == null ? null : value.toString();
    }

    private static int toInt(Number value) {
        return value == null ? 0 : value.intValue();
    }

    private static int toInt(BigDecimal value) {
        return value == null ? 0 : value.intValue();
    }

    private static double round1(double value) {
        return Math.round(value * 10.0) / 10.0;
    }

    private static String mapVehicleTypeToTonnage(String vehicleType) {
        String type = normalizeText(vehicleType).toUpperCase(Locale.ROOT);
        if (type.isBlank()) return "기타";
        String normalized = type
                .replace('-', '_')
                .replace(' ', '_');
        if ("DAMAS".equals(normalized)) return "다마스";
        if ("LABO".equals(normalized)) return "라보";

        // 긴 코드(대형 톤수)부터 먼저 검사해 오매핑을 방지한다.
        if (containsAny(normalized, "TON_25", "TON25")) return "25톤";
        if (containsAny(normalized, "TON_18", "TON18")) return "18톤";
        if (containsAny(normalized, "TON_15", "TON15")) return "15톤";
        if (containsAny(normalized, "TON_14", "TON14")) return "14톤";
        if (containsAny(normalized, "TON_11", "TON11")) return "11톤";
        if (containsAny(normalized, "TON_8", "TON8")) return "8톤";
        if (containsAny(normalized, "TON_5_AXLE", "TON5AXLE", "5_AXLE", "5AXLE")) return "5축";
        if (containsAny(normalized, "TON_2_5", "TON2_5", "TON2.5", "2_5", "2.5")) return "2.5톤";
        if (containsAny(normalized, "TON_3_5", "TON3_5", "TON3.5", "3_5", "3.5")) return "3.5톤";
        if (containsAny(normalized, "TON_5", "TON5")) return "5톤";
        if (containsAny(normalized, "TON_1_4", "TON1_4", "TON1.4", "1_4", "1.4")) return "1.4톤";
        if (containsAny(normalized, "TON_1", "TON1")) return "1톤";
        return vehicleType;
    }

    private static boolean containsAny(String source, String... candidates) {
        if (source == null || source.isBlank() || candidates == null || candidates.length == 0) {
            return false;
        }
        for (String candidate : candidates) {
            if (candidate != null && !candidate.isBlank() && source.contains(candidate)) {
                return true;
            }
        }
        return false;
    }

    private static String mapVehicleTypeToBodyType(String vehicleType) {
        String type = normalizeText(vehicleType).toUpperCase(Locale.ROOT);
        if (type.contains("REFRIGERATED") || type.contains("냉장")) return "냉장차";
        if (type.contains("WING")) return "윙바디";
        if (type.contains("TOP")) return "탑차";
        if (type.contains("TRACTOR") || type.contains("TRAILER")) return "추레라";
        if (type.contains("LADDER")) return "사다리차";
        return "일반카고";
    }

    private static String mapScope(SurchargeOptionType type, String optionCode) {
        String code = normalizeText(optionCode).toUpperCase(Locale.ROOT);
        if (code.startsWith("SETTLEMENT_")) return "SETTLEMENT_POLICY";
        if (type == null) return "TRANSPORT_OPTION";
        return switch (type) {
            case FIXED_BY_VEHICLE -> "VEHICLE_OPTION";
            case ADD -> "LOAD_UNLOAD_TOOL";
            case MULT -> "COMBINE_RULE";
            case FIXED -> "TRANSPORT_OPTION";
        };
    }

    private record DispatchSnapshot(
            Match match,
            Quote quote,
            Driver driver,
            Shipper shipper,
            Truck truck,
            Settlement settlement,
            Payment payment,
            long unreadCount
    ) {}

    // ========== DTO 변환 메서드 (타입 안전 응답) ==========

    /** 배차 목록 DTO 조회 (타입 안전) */
    @Transactional(readOnly = true)
    public PaginatedResponse<DispatchRowResponse> listDispatchRowsTyped(
            String status, String dispatchState, Integer page, Integer size
    ) {
        String statusFilter = normalizeText(status).toUpperCase(Locale.ROOT);
        String dispatchFilter = normalizeText(dispatchState).toUpperCase(Locale.ROOT);
        Match.Status dbStatus = parseMatchStatus(statusFilter);
        Boolean dbAccepted = parseAcceptedFilter(dispatchFilter);
        int p = page == null || page < 1 ? 1 : page;
        int s = size == null || size < 1 ? 20 : Math.min(size, 100);

        long total = matchRepository.countByAcceptedAndStatusFiltered(dbAccepted, dbStatus);
        List<Match> matches = matchRepository.findByAcceptedAndStatusFiltered(
                dbAccepted, dbStatus, PageRequest.of(p - 1, s)
        );
        List<DispatchRowResponse> rows = buildDispatchSnapshotsForMatches(matches).stream()
                .filter(snapshot -> snapshot.quote() != null)
                .map(this::toDispatchRowDto)
                .toList();
        return PaginatedResponse.of(rows, (int) total);
    }

    private DispatchRowResponse toDispatchRowDto(DispatchSnapshot snapshot) {
        Quote quote = snapshot.quote();
        Settlement settlement = snapshot.settlement();
        Payment payment = snapshot.payment();
        Truck truck = snapshot.truck();

        int totalFare = settlement == null ? toInt(quote.getFinalPrice()) : toInt(settlement.getTotalFare());
        int driverPayout = settlement == null ? Math.max(0, (int) Math.round(totalFare * 0.85)) : toInt(settlement.getDriverPayout());
        int platformFee = settlement == null ? Math.max(0, totalFare - driverPayout) : toInt(settlement.getPlatformFee());
        double currentVolume = quote.getVolumeCbm() == null ? 0.0 : quote.getVolumeCbm();
        double maxVolume = truck == null || truck.getMaxVolume() == null ? currentVolume : truck.getMaxVolume().doubleValue();
        double remainingVolume = Math.max(0.0, maxVolume - currentVolume);

        return DispatchRowResponse.builder()
                .matchId(formatId("M", snapshot.match().getMatchId()))
                .quoteId(formatId("Q", quote.getQuoteId()))
                .shipperName(snapshot.shipper() == null ? "화주" : defaultText(snapshot.shipper().getName(), "화주"))
                .cargoType(defaultText(quote.getCargoType(), defaultText(quote.getCargoName(), "-")))
                .originAddress(defaultText(quote.getOriginAddress(), "-"))
                .destinationAddress(defaultText(quote.getDestinationAddress(), "-"))
                .requestedAt(toText(quote.getCreatedAt()))
                .departAt(toText(snapshot.match().getAcceptedAt()))
                .arriveAt(snapshot.match().getStatus() == Match.Status.COMPLETED ? toText(snapshot.match().getUpdatedAt()) : null)
                .driverName(snapshot.driver() == null ? null : defaultText(snapshot.driver().getName(), "기사"))
                .truckName(truck == null ? null : defaultText(truck.getName(), defaultText(truck.getVehicleType(), "트럭")))
                .matchStatus(snapshot.match().getStatus().name())
                .accepted(Boolean.TRUE.equals(snapshot.match().getAccepted()))
                .currentVolumeCbm(round1(currentVolume))
                .remainingVolumeCbm(round1(remainingVolume))
                .routeDistanceKm(toInt(quote.getDistanceKm()))
                .totalFare(totalFare)
                .driverPayout(driverPayout)
                .platformFee(platformFee)
                .paymentStatus(payment == null || payment.getStatus() == null ? "PENDING" : payment.getStatus().name())
                .settlementStatus(settlement == null || settlement.getSettlementStatus() == null ? "PENDING" : settlement.getSettlementStatus().name())
                .unreadNotificationCount((int) snapshot.unreadCount())
                .deviationSeverity("NONE")
                .build();
    }

    /** 정산 승인 목록 DTO 조회 (타입 안전) */
    @Transactional(readOnly = true)
    public List<SettlementApprovalRowResponse> listSettlementApprovalsTyped() {
        return settlementRepository.findPendingOrNullBySettlementStatus(
                        Settlement.SettlementStatus.PENDING,
                        PageRequest.of(0, ACTIVITY_SOURCE_LIMIT)
                ).stream()
                .map(this::toSettlementApprovalRowDto)
                .toList();
    }

    private SettlementApprovalRowResponse toSettlementApprovalRowDto(Settlement settlement) {
        Driver driver = driverRepository.findById(settlement.getDriverId()).orElse(null);
        Shipper shipper = shipperRepository.findById(settlement.getShipperId()).orElse(null);
        return SettlementApprovalRowResponse.builder()
                .settlementId("SET-" + settlement.getSettlementId())
                .matchId(formatId("M", settlement.getMatchId()))
                .driverId(formatId("D", settlement.getDriverId()))
                .driverName(driver == null ? "기사" : defaultText(driver.getName(), "기사"))
                .shipperName(shipper == null ? "화주" : defaultText(shipper.getName(), "화주"))
                .dueDate(settlement.getDueDate() == null ? "-" : settlement.getDueDate().toString())
                .totalFare(toInt(settlement.getTotalFare()))
                .driverPayout(toInt(settlement.getDriverPayout()))
                .settlementStatus(settlement.getSettlementStatus() == null ? "PENDING" : settlement.getSettlementStatus().name())
                .approvalStatus(resolveApprovalStatus(settlement))
                .reviewMemo(settlement.getReviewMemo())
                .build();
    }

    /** 활동 로그 DTO 조회 (타입 안전) */
    @Transactional(readOnly = true)
    public List<ActivityLogResponse> listActivityLogsTyped() {
        List<ActivityLogResponse> logs = new ArrayList<>();

        for (SanctionEvent event : sanctionEventRepository.findAllByOrderByCreatedAtDesc(
                PageRequest.of(0, ACTIVITY_SOURCE_LIMIT)
        )) {
            logs.add(ActivityLogResponse.builder()
                    .id("SAN-" + event.getSanctionId())
                    .timestamp(toText(event.getCreatedAt()))
                    .action("SANCTION_" + defaultText(event.getType(), "UPDATED"))
                    .targetId(defaultText(event.getTargetId(), "-"))
                    .mode("REAL")
                    .message(defaultText(event.getReason(), "제재 기록"))
                    .build());
        }

        List<Settlement> reviewedSettlements = settlementRepository.findNotStatusOrderByCreatedAtDesc(
                Settlement.SettlementStatus.PENDING,
                PageRequest.of(0, ACTIVITY_SOURCE_LIMIT)
        );
        for (Settlement settlement : reviewedSettlements) {
            if (normalizeText(settlement.getReviewMemo()).isBlank()) continue;
            logs.add(ActivityLogResponse.builder()
                    .id("SET-" + settlement.getSettlementId())
                    .timestamp(toText(settlement.getUpdatedAt()))
                    .action("SETTLEMENT_REVIEWED")
                    .targetId("SET-" + settlement.getSettlementId())
                    .mode("REAL")
                    .message(settlement.getReviewMemo())
                    .build());
        }

        logs.sort((left, right) -> String.valueOf(right.getTimestamp()).compareTo(String.valueOf(left.getTimestamp())));
        return logs.stream().limit(200).toList();
    }

    private DeliveryHistoryRowResponse toDeliveryHistoryRowDto(DispatchSnapshot snapshot) {
        Quote quote = snapshot.quote();
        Settlement settlement = snapshot.settlement();
        if (quote == null) {
            return DeliveryHistoryRowResponse.builder().build();
        }
        return DeliveryHistoryRowResponse.builder()
                .matchId(formatId("M", snapshot.match().getMatchId()))
                .quoteId(formatId("Q", quote.getQuoteId()))
                .shipperName(snapshot.shipper() == null ? "화주" : defaultText(snapshot.shipper().getName(), "화주"))
                .driverName(snapshot.driver() == null ? "미배정" : defaultText(snapshot.driver().getName(), "기사"))
                .originAddress(defaultText(quote.getOriginAddress(), "-"))
                .destinationAddress(defaultText(quote.getDestinationAddress(), "-"))
                .departAt(toText(snapshot.match().getAcceptedAt() == null ? snapshot.match().getCreatedAt() : snapshot.match().getAcceptedAt()))
                .arriveAt(snapshot.match().getStatus() == Match.Status.COMPLETED ? toText(snapshot.match().getUpdatedAt()) : null)
                .matchStatus(snapshot.match().getStatus().name())
                .settlementStatus(settlement == null ? "PENDING" : settlement.getSettlementStatus().name())
                .totalFare(settlement == null ? toInt(quote.getFinalPrice()) : toInt(settlement.getTotalFare()))
                .driverPayout(settlement == null
                        ? Math.max(0, (int) Math.round(toInt(quote.getFinalPrice()) * 0.85))
                        : toInt(settlement.getDriverPayout()))
                .build();
    }

    private LiveDeliveryRowResponse toLiveDeliveryRowDto(DispatchSnapshot snapshot) {
        Quote quote = snapshot.quote();
        if (quote == null) {
            return LiveDeliveryRowResponse.builder().build();
        }
        List<GpsLog> recentLogs = findRecentGpsLogs(snapshot.match().getMatchId(), 1);
        GpsLog latest = recentLogs.isEmpty() ? null : recentLogs.get(0);
        int progress = resolveLiveProgress(snapshot.match(), quote, latest);

        double currentLat = latest != null && latest.getLat() != null
                ? latest.getLat().doubleValue()
                : quote.getOriginLat() == null ? 0.0 : quote.getOriginLat();
        double currentLng = latest != null && latest.getLng() != null
                ? latest.getLng().doubleValue()
                : quote.getOriginLng() == null ? 0.0 : quote.getOriginLng();
        double speedKmh = latest != null && latest.getSpeedKmh() != null
                ? latest.getSpeedKmh().doubleValue()
                : 0.0;
        double deviationDistanceKm = isDeviation(latest) && latest.getDeviationDistanceM() != null
                ? Math.round((latest.getDeviationDistanceM() / 1000.0) * 100.0) / 100.0
                : 0.0;

        return LiveDeliveryRowResponse.builder()
                .matchId(formatId("M", snapshot.match().getMatchId()))
                .quoteId(formatId("Q", quote.getQuoteId()))
                .driverId(snapshot.driver() == null ? "-" : formatId("D", snapshot.driver().getDriverId()))
                .driverName(snapshot.driver() == null ? "미배정" : defaultText(snapshot.driver().getName(), "기사"))
                .shipperName(snapshot.shipper() == null ? "화주" : defaultText(snapshot.shipper().getName(), "화주"))
                .originAddress(defaultText(quote.getOriginAddress(), "-"))
                .destinationAddress(defaultText(quote.getDestinationAddress(), "-"))
                .currentLat(currentLat)
                .currentLng(currentLng)
                .speedKmh(speedKmh)
                .progressPercent(progress)
                .deviationDistanceKm(deviationDistanceKm)
                .routeUpdatedAt(toText(latest == null ? snapshot.match().getUpdatedAt() : latest.getLoggedAt()))
                .liveStatus(resolveLiveStatus(snapshot.match(), latest, deviationDistanceKm))
                .build();
    }

    private boolean containsDeliveryHistoryKeyword(DeliveryHistoryRowResponse row, String keyword) {
        if (row == null || keyword == null || keyword.isBlank()) {
            return true;
        }
        String joined = String.join(" ",
                defaultText(row.getMatchId(), ""),
                defaultText(row.getQuoteId(), ""),
                defaultText(row.getShipperName(), ""),
                defaultText(row.getDriverName(), ""),
                defaultText(row.getOriginAddress(), ""),
                defaultText(row.getDestinationAddress(), ""));
        return joined.toLowerCase(Locale.ROOT).contains(keyword);
    }

    private Map<String, Object> toDeliveryHistoryRowMap(DeliveryHistoryRowResponse row) {
        Map<String, Object> mapped = new LinkedHashMap<>();
        mapped.put("matchId", row.getMatchId());
        mapped.put("quoteId", row.getQuoteId());
        mapped.put("shipperName", row.getShipperName());
        mapped.put("driverName", row.getDriverName());
        mapped.put("originAddress", row.getOriginAddress());
        mapped.put("destinationAddress", row.getDestinationAddress());
        mapped.put("departAt", row.getDepartAt());
        mapped.put("arriveAt", row.getArriveAt());
        mapped.put("matchStatus", row.getMatchStatus());
        mapped.put("settlementStatus", row.getSettlementStatus());
        mapped.put("totalFare", row.getTotalFare());
        mapped.put("driverPayout", row.getDriverPayout());
        return mapped;
    }

    private Map<String, Object> toLiveDeliveryRowMap(LiveDeliveryRowResponse row) {
        Map<String, Object> mapped = new LinkedHashMap<>();
        mapped.put("matchId", row.getMatchId());
        mapped.put("quoteId", row.getQuoteId());
        mapped.put("driverId", row.getDriverId());
        mapped.put("driverName", row.getDriverName());
        mapped.put("shipperName", row.getShipperName());
        mapped.put("originAddress", row.getOriginAddress());
        mapped.put("destinationAddress", row.getDestinationAddress());
        mapped.put("currentLat", row.getCurrentLat());
        mapped.put("currentLng", row.getCurrentLng());
        mapped.put("speedKmh", row.getSpeedKmh());
        mapped.put("progressPercent", row.getProgressPercent());
        mapped.put("deviationDistanceKm", row.getDeviationDistanceKm());
        mapped.put("routeUpdatedAt", row.getRouteUpdatedAt());
        mapped.put("liveStatus", row.getLiveStatus());
        return mapped;
    }

    private Map<String, Object> toLiveDeliveryDetailMap(LiveDeliveryDetailResponse response) {
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("matchId", response.getMatchId());
        out.put("cargoType", response.getCargoType());
        out.put("cargoWeightKg", response.getCargoWeightKg());
        out.put("truckType", response.getTruckType());
        out.put("truckWeightTon", response.getTruckWeightTon());
        out.put("truckVolumeCbm", response.getTruckVolumeCbm());
        out.put("totalRouteKm", response.getTotalRouteKm());
        out.put("routeProgressPercent", response.getRouteProgressPercent());
        out.put("deviationReason", response.getDeviationReason());
        out.put("plannedRoute", response.getPlannedRoute().stream().map(point -> {
            Map<String, Object> mapped = new LinkedHashMap<>();
            mapped.put("lat", point.getLat());
            mapped.put("lng", point.getLng());
            mapped.put("recordedAt", point.getRecordedAt());
            return mapped;
        }).toList());
        out.put("currentRoute", response.getCurrentRoute().stream().map(point -> {
            Map<String, Object> mapped = new LinkedHashMap<>();
            mapped.put("lat", point.getLat());
            mapped.put("lng", point.getLng());
            mapped.put("recordedAt", point.getRecordedAt());
            return mapped;
        }).toList());
        out.put("timeline", response.getTimeline().stream().map(event -> {
            Map<String, Object> mapped = new LinkedHashMap<>();
            mapped.put("id", event.getId());
            mapped.put("label", event.getLabel());
            mapped.put("occurredAt", event.getOccurredAt());
            mapped.put("note", event.getNote());
            return mapped;
        }).toList());
        return out;
    }

    private LiveDeliveryDetailResponse.RoutePoint toRoutePointDto(Map<String, Object> point) {
        return LiveDeliveryDetailResponse.RoutePoint.builder()
                .lat(toDouble(point.get("lat")))
                .lng(toDouble(point.get("lng")))
                .recordedAt(defaultText(point.get("recordedAt"), null))
                .build();
    }

    private LiveDeliveryDetailResponse.TimelineEvent toTimelineEventDto(Map<String, Object> event) {
        return LiveDeliveryDetailResponse.TimelineEvent.builder()
                .id(defaultText(event.get("id"), ""))
                .label(defaultText(event.get("label"), ""))
                .occurredAt(defaultText(event.get("occurredAt"), null))
                .note(defaultText(event.get("note"), null))
                .build();
    }

    private double toDouble(Object value) {
        if (value instanceof Number number) {
            return number.doubleValue();
        }
        try {
            return value == null ? 0.0 : Double.parseDouble(String.valueOf(value));
        } catch (NumberFormatException ignored) {
            return 0.0;
        }
    }
}
