package com.freight.backend.service;

import com.freight.backend.entity.Driver;
import com.freight.backend.entity.Match;
import com.freight.backend.entity.Quote;
import com.freight.backend.entity.Shipper;
import com.freight.backend.exception.CustomException;
import com.freight.backend.exception.ErrorCode;
import com.freight.backend.repository.DriverRepository;
import com.freight.backend.repository.MatchRepository;
import com.freight.backend.repository.QuoteRepository;
import com.freight.backend.repository.ShipperRepository;
import com.freight.backend.repository.TruckRepository;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.stream.Collectors;
import java.util.stream.Stream;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class AdminOpsService {
    private static final int USER_SCAN_LIMIT = 2000;

    private final QuoteRepository quoteRepository;
    private final MatchRepository matchRepository;
    private final DriverRepository driverRepository;
    private final ShipperRepository shipperRepository;
    private final TruckRepository truckRepository;

    @Transactional(readOnly = true)
    public Map<String, Object> getDashboard(String range) {
        LocalDate today = LocalDate.now();
        LocalDateTime todayStart = today.atStartOfDay();
        LocalDateTime weekStart = today.minusDays(6).atStartOfDay();

        // 성능 최적화: DB 카운트 쿼리 사용
        long todayOrders = quoteRepository.countByCreatedAtAfter(todayStart);
        long weeklyOrders = quoteRepository.countByCreatedAtAfter(weekStart);
        long inTransit = matchRepository.countByStatus(Match.Status.IN_TRANSIT);
        long completed = matchRepository.countByStatus(Match.Status.COMPLETED);
        long cancelledQuotes = quoteRepository.countByStatus("CANCELLED");

        // 성능 최적화: 총 매출은 DB 집계 쿼리 사용
        long totalFinalPrice = quoteRepository.sumFinalPrice();
        int platformFee = (int) Math.round(totalFinalPrice * 0.1);

        // 미정산 금액은 DB 집계 쿼리로 계산한다.
        long unsettled = quoteRepository.sumUnsettledFinalPrice(Match.Status.COMPLETED);

        // 성능 최적화: DB 카운트 쿼리 사용
        long totalQuotesOpen = quoteRepository.countByStatus("OPEN");
        long totalMatches = matchRepository.count();
        long nonCancelledMatches = matchRepository.countNonCancelled();
        long driverCompleted = matchRepository.countDriverCompleted();
        long totalDrivers = driverRepository.count();
        long totalShippers = shipperRepository.count();
        long pendingDriverApprovals = driverRepository.countPendingApprovals();
        long pendingTruckApprovals = truckRepository.countPendingApprovals();
        long newDriversToday = driverRepository.countByCreatedAtAfter(todayStart);
        long newShippersToday = shipperRepository.countByCreatedAtAfter(todayStart);

        // 성능 최적화: 최근 5건 매칭만 조회
        List<Match> recentMatchList = matchRepository.findRecentMatches(PageRequest.of(0, 5));

        // 최근 매칭에 필요한 Quote/Shipper/Driver만 조회
        List<Long> recentQuoteIds = recentMatchList.stream()
                .map(Match::getQuoteId)
                .filter(id -> id != null && id > 0)
                .distinct()
                .toList();
        Map<Long, Quote> quoteMap = quoteRepository.findAllById(recentQuoteIds).stream()
                .collect(Collectors.toMap(Quote::getQuoteId, q -> q, (left, right) -> left));

        List<Long> recentShipperIds = quoteMap.values().stream()
                .map(Quote::getShipperId)
                .filter(id -> id != null && id > 0)
                .distinct()
                .toList();
        List<Long> recentDriverIds = recentMatchList.stream()
                .map(Match::getDriverId)
                .filter(id -> id != null && id > 0)
                .distinct()
                .toList();

        Map<Long, String> shipperNameMap = shipperRepository.findAllById(recentShipperIds).stream()
                .collect(Collectors.toMap(Shipper::getShipperId, s -> defaultText(s.getName(), "화주"), (left, right) -> left));
        Map<Long, String> driverNameMap = driverRepository.findAllById(recentDriverIds).stream()
                .collect(Collectors.toMap(Driver::getDriverId, d -> defaultText(d.getName(), "기사"), (left, right) -> left));

        List<Map<String, Object>> recentMatches = recentMatchList.stream()
                .map(m -> toRecentMatchRow(m, quoteMap, shipperNameMap, driverNameMap))
                .toList();

        Map<String, Object> kpi = new LinkedHashMap<>();
        kpi.put("today_orders", (int) todayOrders);
        kpi.put("weekly_orders", (int) weeklyOrders);
        kpi.put("dispatch_completion_rate", totalMatches == 0 ? 0 : (int) Math.round((completed * 100.0) / totalMatches));
        kpi.put("avg_dispatch_minutes", 45);
        kpi.put("in_transit_count", (int) inTransit);
        kpi.put("canceled_quotes", (int) cancelledQuotes);
        kpi.put("gmv", totalFinalPrice);
        kpi.put("platform_fee", platformFee);
        kpi.put("unsettled_amount", unsettled);
        // 관리자 웹 KPI와 1:1로 맞추기 위한 확장 필드
        kpi.put("total_shippers", totalShippers);
        kpi.put("total_drivers", totalDrivers);
        kpi.put("new_shippers_today", newShippersToday);
        kpi.put("new_drivers_today", newDriversToday);
        kpi.put("total_quotes_open", totalQuotesOpen);
        kpi.put("total_matches", totalMatches);
        kpi.put("match_completion_rate", nonCancelledMatches == 0
                ? 0
                : Math.round((completed * 1000.0) / nonCancelledMatches) / 10.0);
        kpi.put("average_matching_time", 45);
        kpi.put("total_revenue", totalFinalPrice);
        kpi.put("total_platform_fee", platformFee);
        kpi.put("total_settlement_amount", unsettled);
        kpi.put("deviation_cases_open", 0);
        kpi.put("driver_completion_rate", nonCancelledMatches == 0
                ? 0
                : Math.round((driverCompleted * 1000.0) / nonCancelledMatches) / 10.0);
        kpi.put("driver_on_time_rate", 0.0);

        Map<String, Object> out = new LinkedHashMap<>();
        out.put("kpi", kpi);
        out.put("deviations", List.of());
        out.put("recent_matches", recentMatches);
        out.put("pending_approvals", Map.of(
                "drivers", (int) pendingDriverApprovals,
                "trucks", (int) pendingTruckApprovals
        ));
        out.put("range", range);
        return out;
    }

    @Transactional(readOnly = true)
    public Map<String, Object> getUsers(String role, String status, String q, Integer page, Integer size) {
        String roleNorm = role == null ? "ALL" : role.toUpperCase(Locale.ROOT);
        String qNorm = q == null ? "" : q.trim().toLowerCase(Locale.ROOT);
        int p = page == null || page < 1 ? 1 : page;
        int s = size == null || size < 1 ? 20 : size;
        PageRequest userScan = PageRequest.of(0, USER_SCAN_LIMIT, Sort.by(Sort.Direction.DESC, "createdAt"));

        List<Map<String, Object>> items = new ArrayList<>();
        if (!"DRIVER".equals(roleNorm)) {
            List<Shipper> shippers = shipperRepository.findAll(userScan).getContent();
            List<Long> shipperIds = shippers.stream()
                    .map(Shipper::getShipperId)
                    .filter(id -> id != null && id > 0)
                    .toList();
            Map<Long, Long> quoteCountByShipper = toCountMap(quoteRepository.countByShipperIds(shipperIds));
            Map<Long, Long> matchCountByShipper = toCountMap(matchRepository.countByShipperIdsNotCancelled(shipperIds));
            for (Shipper shipper : shippers) {
                if (!matchesQuery(qNorm, shipper.getName(), shipper.getEmail(), shipper.getPhone())) continue;
                Map<String, Object> row = new LinkedHashMap<>();
                row.put("id", "S-" + shipper.getShipperId());
                row.put("role", "SHIPPER");
                row.put("name", shipper.getName());
                row.put("email", shipper.getEmail());
                row.put("phone", shipper.getPhone());
                row.put("status", normalizeUserStatus(shipper.getStatus()));
                row.put("created_at", shipper.getCreatedAt() == null ? null : shipper.getCreatedAt().toString());
                row.put("quotes_count", quoteCountByShipper.getOrDefault(shipper.getShipperId(), 0L).intValue());
                row.put("matches_count", matchCountByShipper.getOrDefault(shipper.getShipperId(), 0L).intValue());
                items.add(row);
            }
        }
        if (!"SHIPPER".equals(roleNorm)) {
            List<Driver> drivers = driverRepository.findAll(userScan).getContent();
            List<Long> driverIds = drivers.stream()
                    .map(Driver::getDriverId)
                    .filter(id -> id != null && id > 0)
                    .toList();
            Map<Long, Long> matchCountByDriver = toCountMap(matchRepository.countByDriverIds(driverIds));
            for (Driver driver : drivers) {
                if (!matchesQuery(qNorm, driver.getName(), driver.getEmail(), driver.getPhone())) continue;
                Map<String, Object> row = new LinkedHashMap<>();
                row.put("id", "D-" + driver.getDriverId());
                row.put("role", "DRIVER");
                row.put("name", driver.getName());
                row.put("email", driver.getEmail());
                row.put("phone", driver.getPhone());
                row.put("status", normalizeUserStatus(driver.getStatus()));
                row.put("created_at", driver.getCreatedAt() == null ? null : driver.getCreatedAt().toString());
                row.put("quotes_count", 0);
                row.put("matches_count", matchCountByDriver.getOrDefault(driver.getDriverId(), 0L).intValue());
                items.add(row);
            }
        }

        if (status != null && !status.isBlank() && !"ALL".equalsIgnoreCase(status)) {
            items = items.stream().filter(i -> status.equalsIgnoreCase(String.valueOf(i.get("status")))).toList();
        }

        items = items.stream()
                .sorted(Comparator.comparing(i -> String.valueOf(i.getOrDefault("created_at", "")), Comparator.reverseOrder()))
                .toList();

        int total = items.size();
        int from = Math.min((p - 1) * s, total);
        int to = Math.min(from + s, total);
        List<Map<String, Object>> sliced = items.subList(from, to);

        Map<String, Object> out = new LinkedHashMap<>();
        out.put("items", sliced);
        out.put("total", total);
        return out;
    }

    @Transactional(readOnly = true)
    public Map<String, Object> getUserDetail(String userId) {
        UserRef ref = parseUserRef(userId);

        if ("S".equals(ref.prefix())) {
            Shipper s = shipperRepository.findById(ref.id()).orElseThrow(() -> new CustomException(ErrorCode.INVALID_REQUEST));
            return buildShipperDetail(s);
        }
        Driver d = driverRepository.findById(ref.id()).orElseThrow(() -> new CustomException(ErrorCode.INVALID_REQUEST));
        return buildDriverDetail(d);
    }

    @Transactional
    public Map<String, Object> updateUserStatus(String userId, String status) {
        String next = normalizeUserStatus(status);
        UserRef ref = parseUserRef(userId);

        if ("S".equals(ref.prefix())) {
            Shipper shipper = shipperRepository.findById(ref.id())
                    .orElseThrow(() -> new CustomException(ErrorCode.INVALID_REQUEST));
            shipper.updateStatus(next);
            shipperRepository.save(shipper);
            return buildShipperDetail(shipper);
        }

        Driver driver = driverRepository.findById(ref.id())
                .orElseThrow(() -> new CustomException(ErrorCode.INVALID_REQUEST));
        driver.updateStatus(next);
        driverRepository.save(driver);
        return buildDriverDetail(driver);
    }

    private Map<String, Object> buildShipperDetail(Shipper shipper) {
        List<Quote> quotes = quoteRepository.findByShipperId(shipper.getShipperId());
        List<Match> matches = matchRepository.findByShipperIdAndStatusNotCancelled(shipper.getShipperId());

        Map<String, Object> user = new LinkedHashMap<>();
        user.put("id", "S-" + shipper.getShipperId());
        user.put("role", "SHIPPER");
        user.put("name", shipper.getName());
        user.put("email", shipper.getEmail());
        user.put("phone", shipper.getPhone());
        user.put("status", normalizeUserStatus(shipper.getStatus()));
        user.put("created_at", shipper.getCreatedAt() == null ? null : shipper.getCreatedAt().toString());

        List<Map<String, Object>> quoteRows = quotes.stream().map(q -> {
            Map<String, Object> row = new LinkedHashMap<>();
            row.put("id", String.valueOf(q.getQuoteId()));
            row.put("status", q.getStatus());
            row.put("created_at", q.getCreatedAt() == null ? null : q.getCreatedAt().toString());
            return row;
        }).toList();

        List<Map<String, Object>> matchRows = matches.stream().map(m -> {
            Map<String, Object> row = new LinkedHashMap<>();
            row.put("id", String.valueOf(m.getMatchId()));
            row.put("status", m.getStatus().name());
            row.put("created_at", m.getCreatedAt() == null ? null : m.getCreatedAt().toString());
            return row;
        }).toList();

        Map<String, Object> out = new LinkedHashMap<>();
        out.put("user", user);
        out.put("quotes", quoteRows);
        out.put("matches", matchRows);
        out.put("settlements", List.of());
        out.put("deviation_events", List.of());
        return out;
    }

    private Map<String, Object> buildDriverDetail(Driver driver) {
        List<Match> matches = matchRepository.findByDriverId(driver.getDriverId());

        Map<String, Object> user = new LinkedHashMap<>();
        user.put("id", "D-" + driver.getDriverId());
        user.put("role", "DRIVER");
        user.put("name", driver.getName());
        user.put("email", driver.getEmail());
        user.put("phone", driver.getPhone());
        user.put("status", normalizeUserStatus(driver.getStatus()));
        user.put("created_at", driver.getCreatedAt() == null ? null : driver.getCreatedAt().toString());

        List<Map<String, Object>> matchRows = matches.stream().map(m -> {
            Map<String, Object> row = new LinkedHashMap<>();
            row.put("id", String.valueOf(m.getMatchId()));
            row.put("status", m.getStatus().name());
            row.put("created_at", m.getCreatedAt() == null ? null : m.getCreatedAt().toString());
            return row;
        }).toList();

        Map<String, Object> out = new LinkedHashMap<>();
        out.put("user", user);
        out.put("quotes", List.of());
        out.put("matches", matchRows);
        out.put("settlements", List.of());
        out.put("deviation_events", List.of());
        return out;
    }

    private boolean matchesQuery(String query, String... fields) {
        if (query == null || query.isBlank()) return true;
        return Stream.of(fields)
                .filter(v -> v != null && !v.isBlank())
                .map(v -> v.toLowerCase(Locale.ROOT))
                .anyMatch(v -> v.contains(query));
    }

    private String normalizeUserStatus(String status) {
        String v = status == null ? "" : status.trim().toUpperCase(Locale.ROOT);
        if ("SUSPENDED".equals(v)) return "SUSPENDED";
        if ("DRIVING_BLOCKED".equals(v)) return "DRIVING_BLOCKED";
        return "ACTIVE";
    }

    private UserRef parseUserRef(String userId) {
        if (userId == null || !userId.contains("-")) {
            throw new CustomException(ErrorCode.INVALID_REQUEST);
        }
        String[] parts = userId.split("-", 2);
        if (parts.length < 2 || parts[1].isBlank()) {
            throw new CustomException(ErrorCode.INVALID_REQUEST);
        }
        String prefix = parts[0].toUpperCase(Locale.ROOT);
        Long id;
        try {
            id = Long.parseLong(parts[1]);
        } catch (NumberFormatException e) {
            throw new CustomException(ErrorCode.INVALID_REQUEST);
        }
        if (!"S".equals(prefix) && !"D".equals(prefix)) {
            throw new CustomException(ErrorCode.INVALID_REQUEST);
        }
        return new UserRef(prefix, id);
    }

    private Map<String, Object> toRecentMatchRow(
            Match match,
            Map<Long, Quote> quoteMap,
            Map<Long, String> shipperNameMap,
            Map<Long, String> driverNameMap
    ) {
        Quote quote = quoteMap.get(match.getQuoteId());
        String shipperName = quote == null ? "화주" : shipperNameMap.getOrDefault(quote.getShipperId(), "화주");
        String driverName = match.getDriverId() == null ? "미배정" : driverNameMap.getOrDefault(match.getDriverId(), "기사");

        Map<String, Object> row = new LinkedHashMap<>();
        row.put("match_id", String.valueOf(match.getMatchId()));
        row.put("quote_id", quote == null ? null : String.valueOf(quote.getQuoteId()));
        row.put("shipper_name", shipperName);
        row.put("driver_name", driverName);
        row.put("truck_type", quote == null ? "-" : defaultText(quote.getVehicleType(), "-"));
        row.put("origin_address", quote == null ? "-" : defaultText(quote.getOriginAddress(), "-"));
        row.put("destination_address", quote == null ? "-" : defaultText(quote.getDestinationAddress(), "-"));
        row.put("departure_time", toText(match.getAcceptedAt()));
        row.put("expected_arrival", null);
        row.put("agreed_price", quote == null || quote.getFinalPrice() == null ? 0 : quote.getFinalPrice());
        row.put("status", match.getStatus() == null ? "READY" : match.getStatus().name());
        row.put("payment_status", "PENDING");
        row.put("settlement_status", "PENDING");
        row.put("distance_km", quote == null || quote.getDistanceKm() == null ? 0 : quote.getDistanceKm());
        row.put("estimated_minutes", 0);
        row.put("actual_minutes", null);
        return row;
    }

    private static String toText(LocalDateTime value) {
        return value == null ? null : value.toString();
    }

    private static String defaultText(String value, String fallback) {
        return value == null || value.isBlank() ? fallback : value;
    }

    private static Map<Long, Long> toCountMap(List<Object[]> rows) {
        if (rows == null || rows.isEmpty()) {
            return Map.of();
        }
        Map<Long, Long> out = new LinkedHashMap<>();
        for (Object[] row : rows) {
            if (row == null || row.length < 2) {
                continue;
            }
            if (!(row[0] instanceof Number idValue) || !(row[1] instanceof Number countValue)) {
                continue;
            }
            out.put(idValue.longValue(), countValue.longValue());
        }
        return out;
    }

    private record UserRef(String prefix, Long id) {}
}
