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
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.stream.Stream;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class AdminOpsService {

    private final QuoteRepository quoteRepository;
    private final MatchRepository matchRepository;
    private final DriverRepository driverRepository;
    private final ShipperRepository shipperRepository;

    @Transactional(readOnly = true)
    public Map<String, Object> getDashboard(String range) {
        List<Quote> quotes = quoteRepository.findAll();
        List<Match> matches = matchRepository.findAll();
        LocalDate today = LocalDate.now();
        LocalDate weekStart = today.minusDays(6);

        long todayOrders = quotes.stream()
                .filter(q -> q.getCreatedAt() != null && q.getCreatedAt().toLocalDate().isEqual(today))
                .count();
        long weeklyOrders = quotes.stream()
                .filter(q -> q.getCreatedAt() != null && !q.getCreatedAt().toLocalDate().isBefore(weekStart))
                .count();
        long inTransit = matches.stream().filter(m -> m.getStatus() == Match.Status.IN_TRANSIT).count();
        long completed = matches.stream().filter(m -> m.getStatus() == Match.Status.COMPLETED).count();
        long cancelledQuotes = quotes.stream().filter(q -> "CANCELLED".equalsIgnoreCase(q.getStatus())).count();

        int totalFinalPrice = quotes.stream()
                .map(Quote::getFinalPrice)
                .filter(v -> v != null && v > 0)
                .mapToInt(Integer::intValue)
                .sum();
        int platformFee = (int) Math.round(totalFinalPrice * 0.1);
        int unsettled = quotes.stream()
                .filter(q -> q.getFinalPrice() != null)
                .filter(q -> matches.stream().noneMatch(m -> m.getQuoteId().equals(q.getQuoteId()) && m.getStatus() == Match.Status.COMPLETED))
                .mapToInt(Quote::getFinalPrice)
                .sum();

        Map<String, Object> kpi = new LinkedHashMap<>();
        kpi.put("today_orders", (int) todayOrders);
        kpi.put("weekly_orders", (int) weeklyOrders);
        kpi.put("dispatch_completion_rate", matches.isEmpty() ? 0 : (int) Math.round((completed * 100.0) / matches.size()));
        kpi.put("avg_dispatch_minutes", 45);
        kpi.put("in_transit_count", (int) inTransit);
        kpi.put("canceled_quotes", (int) cancelledQuotes);
        kpi.put("gmv", totalFinalPrice);
        kpi.put("platform_fee", platformFee);
        kpi.put("unsettled_amount", unsettled);

        Map<String, Object> out = new LinkedHashMap<>();
        out.put("kpi", kpi);
        out.put("deviations", List.of());
        out.put("range", range);
        return out;
    }

    @Transactional(readOnly = true)
    public Map<String, Object> getUsers(String role, String status, String q, Integer page, Integer size) {
        String roleNorm = role == null ? "ALL" : role.toUpperCase(Locale.ROOT);
        String qNorm = q == null ? "" : q.trim().toLowerCase(Locale.ROOT);
        int p = page == null || page < 1 ? 1 : page;
        int s = size == null || size < 1 ? 20 : size;

        List<Map<String, Object>> items = new ArrayList<>();
        if (!"DRIVER".equals(roleNorm)) {
            for (Shipper shipper : shipperRepository.findAll()) {
                if (!matchesQuery(qNorm, shipper.getName(), shipper.getEmail(), shipper.getPhone())) continue;
                Map<String, Object> row = new LinkedHashMap<>();
                row.put("id", "S-" + shipper.getShipperId());
                row.put("role", "SHIPPER");
                row.put("name", shipper.getName());
                row.put("email", shipper.getEmail());
                row.put("phone", shipper.getPhone());
                row.put("status", normalizeUserStatus(shipper.getStatus()));
                row.put("created_at", shipper.getCreatedAt() == null ? null : shipper.getCreatedAt().toString());
                row.put("quotes_count", quoteRepository.findByShipperId(shipper.getShipperId()).size());
                row.put("matches_count", matchRepository.findByShipperIdAndStatusNotCancelled(shipper.getShipperId()).size());
                items.add(row);
            }
        }
        if (!"SHIPPER".equals(roleNorm)) {
            for (Driver driver : driverRepository.findAll()) {
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
                row.put("matches_count", matchRepository.findByDriverId(driver.getDriverId()).size());
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
        String prefix = parts[0].toUpperCase(Locale.ROOT);
        Long id = Long.parseLong(parts[1]);
        if (!"S".equals(prefix) && !"D".equals(prefix)) {
            throw new CustomException(ErrorCode.INVALID_REQUEST);
        }
        return new UserRef(prefix, id);
    }

    private record UserRef(String prefix, Long id) {}
}
