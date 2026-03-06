package com.freight.backend.gpsload.routeassembly.service;

import com.freight.backend.entity.QuoteItem;
import com.freight.backend.entity.QuoteStop;
import com.freight.backend.gpsload.loadplan.model.CargoHandling;
import com.freight.backend.gpsload.loadplan.entity.TruckDimension;
import com.freight.backend.gpsload.route.model.Place;
import com.freight.backend.gpsload.routeassembly.model.DriverState;
import com.freight.backend.gpsload.routeassembly.model.Quote;
import com.freight.backend.gpsload.loadplan.repository.TruckDimensionRepository;
import com.freight.backend.repository.QuoteItemRepository;
import com.freight.backend.repository.QuoteStopRepository;
import org.springframework.dao.DataAccessException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;

@Service
public class QuoteCandidateService {

    private static final int DEFAULT_LIMIT = 200;

    private final JdbcTemplate jdbcTemplate;
    private final TruckDimensionRepository truckDimensionRepository;
    private final QuoteItemRepository quoteItemRepository;
    private final QuoteStopRepository quoteStopRepository;

    public QuoteCandidateService(
            JdbcTemplate jdbcTemplate,
            TruckDimensionRepository truckDimensionRepository,
            QuoteItemRepository quoteItemRepository,
            QuoteStopRepository quoteStopRepository
    ) {
        this.jdbcTemplate = jdbcTemplate;
        this.truckDimensionRepository = truckDimensionRepository;
        this.quoteItemRepository = quoteItemRepository;
        this.quoteStopRepository = quoteStopRepository;
    }

    public List<Quote> findOpenCandidates(DriverState driverState, int limit) {
        int effectiveLimit = limit > 0 ? limit : DEFAULT_LIMIT;
        String selectSql = """
                SELECT quote_id,
                       origin_address, origin_lat, origin_lng,
                       destination_address, destination_lat, destination_lng,
                       volume_cbm, weight_kg, allow_combine, final_price,
                       pickup_schedule_start, delivery_deadline,
                       delivery_schedule, status
                FROM quotes
                WHERE status = 'OPEN'
                """;
        String legacySelectSql = """
                SELECT quote_id,
                       origin_address, origin_lat, origin_lng,
                       destination_address, destination_lat, destination_lng,
                       volume_cbm, weight_kg, allow_combine, final_price,
                       delivery_schedule, status
                FROM quotes
                WHERE status = 'OPEN'
                """;

        String orderLimitSql = """
                ORDER BY quote_id DESC
                LIMIT ?
                """;

        Optional<TruckDimension> truckOpt = resolveTruckSpec(driverState);
        List<Quote> raw = queryWithVehicleRules(selectSql, orderLimitSql, truckOpt, effectiveLimit);
        if (raw.isEmpty()) {
            raw = queryWithVehicleRules(legacySelectSql, orderLimitSql, truckOpt, effectiveLimit);
        }
        if (raw.isEmpty()) {
            raw = queryMinimalOpenCandidates(effectiveLimit);
        }
        List<Quote> withWaypoints = applyQuoteWaypoints(raw);
        List<Quote> withItems = applyQuoteItemsAggregation(withWaypoints);
        return applyTruckCapacityFilter(driverState, withItems);
    }

    private List<Quote> queryMinimalOpenCandidates(int limit) {
        String minimalSelectSql = """
                SELECT quote_id,
                       origin_address, origin_lat, origin_lng,
                       destination_address, destination_lat, destination_lng,
                       volume_cbm, weight_kg, allow_combine, final_price,
                       delivery_schedule, status
                FROM quotes
                WHERE status = 'OPEN'
                ORDER BY quote_id DESC
                LIMIT ?
                """;

        try {
            return jdbcTemplate.query(minimalSelectSql, (rs, rowNum) -> mapQuoteMinimal(rs), limit);
        } catch (DataAccessException ignored) {
            return List.of();
        }
    }

    private Optional<TruckDimension> resolveTruckSpec(DriverState driverState) {
        if (driverState == null || driverState.truckId() == null) {
            return Optional.empty();
        }
        return truckDimensionRepository.findById(driverState.truckId());
    }

    private List<Quote> queryWithVehicleRules(
            String selectSql,
            String orderLimitSql,
            Optional<TruckDimension> truckOpt,
            int limit
    ) {
        if (truckOpt.isEmpty()) {
            return jdbcTemplate.query(selectSql + orderLimitSql, (rs, rowNum) -> mapQuote(rs), limit);
        }

        TruckDimension truck = truckOpt.orElseThrow();
        String vehicleType = normalize(truck.getVehicleType());
        String bodyType = normalizeBodyType(truck.getVehicleBodyType());
        Double tonnage = truck.getTonnage() != null ? truck.getTonnage().doubleValue() : null;

        List<QueryPlan> plans = new ArrayList<>();

        // strongest: type + body + tonnage
        if (vehicleType != null || bodyType != null || tonnage != null) {
            List<Object> args = new ArrayList<>();
            StringBuilder where = new StringBuilder(selectSql);
            appendVehicleTypeFilter(where, args, vehicleType);
            appendBodyTypeFilter(where, args, bodyType);
            appendTonnageFilter(where, args, tonnage);
            args.add(limit);
            plans.add(new QueryPlan(where + "\n" + orderLimitSql, args));
        }

        // medium: type + tonnage
        if (vehicleType != null || tonnage != null) {
            List<Object> args = new ArrayList<>();
            StringBuilder where = new StringBuilder(selectSql);
            appendVehicleTypeFilter(where, args, vehicleType);
            appendTonnageFilter(where, args, tonnage);
            args.add(limit);
            plans.add(new QueryPlan(where + "\n" + orderLimitSql, args));
        }

        // weak: type only
        if (vehicleType != null) {
            List<Object> args = new ArrayList<>();
            StringBuilder where = new StringBuilder(selectSql);
            appendVehicleTypeFilter(where, args, vehicleType);
            args.add(limit);
            plans.add(new QueryPlan(where + "\n" + orderLimitSql, args));
        }

        // fallback: OPEN only
        plans.add(new QueryPlan(selectSql + orderLimitSql, List.of(limit)));

        for (QueryPlan plan : plans) {
            try {
                return jdbcTemplate.query(plan.sql(), (rs, rowNum) -> mapQuote(rs), plan.args().toArray());
            } catch (DataAccessException ignored) {
                // try weaker plan when a column is missing in current schema
            }
        }

        return List.of();
    }

    private void appendVehicleTypeFilter(StringBuilder where, List<Object> args, String vehicleType) {
        String normalizedToken = normalizeVehicleTypeToken(vehicleType);
        if (normalizedToken == null) return;
        where.append(" AND (vehicle_type IS NULL OR TRIM(vehicle_type) = '' OR ");
        where.append("LOWER(REPLACE(REPLACE(REPLACE(TRIM(vehicle_type), '-', ''), '_', ''), ' ', '')) = LOWER(?))");
        args.add(normalizedToken);
    }

    private void appendBodyTypeFilter(StringBuilder where, List<Object> args, String bodyType) {
        if (bodyType == null) return;
        where.append(" AND (vehicle_body_type IS NULL OR TRIM(vehicle_body_type) = '' OR LOWER(TRIM(vehicle_body_type)) IN (");
        where.append("LOWER(TRIM(?)), LOWER(TRIM(?)), LOWER(TRIM(?))");
        where.append("))");
        List<String> aliases = bodyTypeAliases(bodyType);
        args.add(aliases.get(0));
        args.add(aliases.get(1));
        args.add(aliases.get(2));
    }

    private void appendTonnageFilter(StringBuilder where, List<Object> args, Double tonnage) {
        if (tonnage == null || tonnage <= 0) return;
        where.append(" AND (tonnage IS NULL OR tonnage <= ?)");
        args.add(tonnage);
    }

    private String normalize(String raw) {
        if (raw == null) return null;
        String s = raw.trim();
        return s.isEmpty() ? null : s;
    }

    private String normalizeVehicleTypeToken(String raw) {
        String s = normalize(raw);
        if (s == null) return null;
        s = s.toLowerCase();
        s = s.replace("-", "").replace("_", "").replace(" ", "");
        return s.isEmpty() ? null : s;
    }

    private String normalizeBodyType(String raw) {
        String s = normalize(raw);
        if (s == null) return null;
        s = s.toLowerCase();
        if (s.equals("wing") || s.equals("wing_body")) return "wingbody";
        if (s.equals("cargo_truck")) return "cargo";
        if (s.equals("top_open")) return "top";
        return s;
    }

    private List<String> bodyTypeAliases(String normalized) {
        if (normalized == null) return List.of("", "", "");
        return switch (normalized) {
            case "wingbody" -> Arrays.asList("wingbody", "wing", "wing_body");
            case "cargo" -> Arrays.asList("cargo", "cargo_truck", "general");
            case "top" -> Arrays.asList("top", "top_open", "topload");
            default -> Arrays.asList(normalized, normalized, normalized);
        };
    }

    private record QueryPlan(String sql, List<Object> args) {}

    private List<Quote> applyQuoteWaypoints(List<Quote> quotes) {
        if (quotes == null || quotes.isEmpty()) {
            return List.of();
        }

        List<Long> quoteIds = quotes.stream()
                .map(Quote::quoteId)
                .filter(id -> id != null && id > 0)
                .toList();
        if (quoteIds.isEmpty()) {
            return quotes;
        }

        Map<Long, List<Place>> waypointsByQuoteId = new HashMap<>();
        List<QuoteStop> stops = quoteStopRepository.findByQuoteIdInOrderByQuoteIdAscSeqAsc(quoteIds);
        for (QuoteStop stop : stops) {
            if (stop == null || stop.getQuoteId() == null || stop.getLat() == null || stop.getLng() == null) {
                continue;
            }
            waypointsByQuoteId.computeIfAbsent(stop.getQuoteId(), ignored -> new ArrayList<>())
                    .add(new Place(null, stop.getAddress(), stop.getLat(), stop.getLng()));
        }

        List<Quote> enriched = new ArrayList<>(quotes.size());
        for (Quote quote : quotes) {
            List<Place> waypoints = waypointsByQuoteId.getOrDefault(quote.quoteId(), List.of());
            enriched.add(new Quote(
                    quote.quoteId(),
                    quote.origin(),
                    quote.destination(),
                    waypoints,
                    quote.volumeCbm(),
                    quote.weightKg(),
                    quote.allowCombine(),
                    quote.finalPrice(),
                    quote.pickupScheduleStart(),
                    quote.deliveryDeadline(),
                    quote.deliverySchedule(),
                    quote.lengthCm(),
                    quote.widthCm(),
                    quote.heightCm(),
                    quote.rotatable(),
                    quote.stackable(),
                    quote.fragile(),
                    quote.noStack(),
                    quote.bottomOnly(),
                    quote.maxStackWeight(),
                    quote.status(),
                    quote.handling()
            ));
        }
        return enriched;
    }

    private List<Quote> applyQuoteItemsAggregation(List<Quote> quotes) {
        if (quotes == null || quotes.isEmpty()) {
            return List.of();
        }

        List<Long> quoteIds = quotes.stream()
                .map(Quote::quoteId)
                .filter(id -> id != null && id > 0)
                .toList();
        if (quoteIds.isEmpty()) {
            return quotes;
        }

        Map<Long, List<QuoteItem>> itemsByQuoteId = new HashMap<>();
        List<QuoteItem> allItems = quoteItemRepository.findByQuoteIdIn(quoteIds);
        for (QuoteItem item : allItems) {
            if (item == null || item.getQuoteId() == null) {
                continue;
            }
            itemsByQuoteId.computeIfAbsent(item.getQuoteId(), ignored -> new ArrayList<>()).add(item);
        }

        List<Quote> enriched = new ArrayList<>(quotes.size());
        for (Quote quote : quotes) {
            List<QuoteItem> quoteItems = itemsByQuoteId.getOrDefault(quote.quoteId(), List.of());
            if (quoteItems.isEmpty()) {
                // Keep base quote candidates even when quote_items rows do not exist yet.
                enriched.add(quote);
                continue;
            }
            enriched.add(toAggregatedQuote(quote, quoteItems));
        }
        return enriched;
    }

    private Quote toAggregatedQuote(Quote quote, List<QuoteItem> items) {
        double totalWeightKg = 0.0;
        double totalVolumeCbm = 0.0;

        Integer maxLength = null;
        Integer maxWidth = null;
        Integer maxHeight = null;

        boolean anyFragile = false;
        boolean anyNoStack = false;
        boolean anyBottomOnly = false;
        boolean allRotatable = true;
        boolean allStackable = true;
        Double minMaxStackWeight = null;

        Set<CargoHandling> handlingSet = new LinkedHashSet<>();

        for (QuoteItem item : items) {
            int quantity = item.getQuantity() == null || item.getQuantity() <= 0 ? 1 : item.getQuantity();

            if (item.getUnitWeightKg() != null && item.getUnitWeightKg() > 0) {
                totalWeightKg += item.getUnitWeightKg() * quantity;
            }

            double perUnitVolume = 0.0;
            if (item.getUnitVolumeCbm() != null && item.getUnitVolumeCbm() > 0) {
                perUnitVolume = item.getUnitVolumeCbm();
            } else if (item.getLengthCm() != null && item.getWidthCm() != null && item.getHeightCm() != null
                    && item.getLengthCm() > 0 && item.getWidthCm() > 0 && item.getHeightCm() > 0) {
                perUnitVolume = (item.getLengthCm() * item.getWidthCm() * item.getHeightCm()) / 1_000_000.0;
            }
            totalVolumeCbm += perUnitVolume * quantity;

            if (item.getLengthCm() != null && item.getLengthCm() > 0) {
                maxLength = maxInt(maxLength, item.getLengthCm());
            }
            if (item.getWidthCm() != null && item.getWidthCm() > 0) {
                maxWidth = maxInt(maxWidth, item.getWidthCm());
            }
            if (item.getHeightCm() != null && item.getHeightCm() > 0) {
                maxHeight = maxInt(maxHeight, item.getHeightCm());
            }

            anyFragile = anyFragile || Boolean.TRUE.equals(item.getFragile());
            anyNoStack = anyNoStack || Boolean.TRUE.equals(item.getNoStack());
            anyBottomOnly = anyBottomOnly || Boolean.TRUE.equals(item.getBottomOnly());
            allRotatable = allRotatable && !Boolean.FALSE.equals(item.getRotatable());
            allStackable = allStackable && !Boolean.FALSE.equals(item.getStackable());

            if (item.getMaxStackWeightKg() != null && item.getMaxStackWeightKg() > 0) {
                minMaxStackWeight = minPositive(minMaxStackWeight, item.getMaxStackWeightKg());
            }
            if (Boolean.TRUE.equals(item.getUpright())) {
                handlingSet.add(CargoHandling.UPRIGHT);
            }
            if (Boolean.TRUE.equals(item.getFragile())) {
                handlingSet.add(CargoHandling.FRAGILE);
            }
            handlingSet.addAll(parseHandlingTags(item.getHandlingTags()));
        }

        if (totalWeightKg <= 0 && quote.weightKg() != null) {
            totalWeightKg = quote.weightKg();
        }
        if (totalVolumeCbm <= 0 && quote.volumeCbm() != null) {
            totalVolumeCbm = quote.volumeCbm();
        }

        boolean effectiveNoStack = anyNoStack || !allStackable;

        return new Quote(
                quote.quoteId(),
                quote.origin(),
                quote.destination(),
                quote.waypoints(),
                totalVolumeCbm > 0 ? totalVolumeCbm : quote.volumeCbm(),
                totalWeightKg > 0 ? totalWeightKg : quote.weightKg(),
                quote.allowCombine(),
                quote.finalPrice(),
                quote.pickupScheduleStart(),
                quote.deliveryDeadline(),
                quote.deliverySchedule(),
                maxLength,
                maxWidth,
                maxHeight,
                allRotatable,
                !effectiveNoStack,
                anyFragile,
                effectiveNoStack,
                anyBottomOnly,
                minMaxStackWeight,
                quote.status(),
                new ArrayList<>(handlingSet)
        );
    }

    private List<CargoHandling> parseHandlingTags(String handlingTags) {
        if (handlingTags == null || handlingTags.isBlank()) {
            return List.of();
        }

        List<CargoHandling> parsed = new ArrayList<>();
        String[] tokens = handlingTags.split("[,;|]");
        for (String token : tokens) {
            if (token == null || token.isBlank()) {
                continue;
            }
            String normalized = token.trim().toUpperCase();
            normalized = normalized.replace('-', '_').replace(' ', '_');
            switch (normalized) {
                case "FRAGILE", "BREAKABLE", "HANDLE_WITH_CARE" -> parsed.add(CargoHandling.FRAGILE);
                case "EASY_BREAK", "SHOCK_SENSITIVE" -> parsed.add(CargoHandling.EASY_BREAK);
                case "UPRIGHT", "THIS_SIDE_UP" -> parsed.add(CargoHandling.UPRIGHT);
                case "KEEP_DRY", "DRY", "WATERPROOF" -> parsed.add(CargoHandling.KEEP_DRY);
                default -> {
                    // ignore unknown tags to keep backward compatibility
                }
            }
        }
        return parsed;
    }

    private Integer maxInt(Integer a, Integer b) {
        if (a == null) return b;
        if (b == null) return a;
        return Math.max(a, b);
    }

    private Double minPositive(Double a, Double b) {
        if (a == null || a <= 0) return b;
        if (b == null || b <= 0) return a;
        return Math.min(a, b);
    }

    private List<Quote> applyTruckCapacityFilter(DriverState driverState, List<Quote> candidates) {
        if (driverState == null || driverState.truckId() == null || candidates == null || candidates.isEmpty()) {
            return candidates;
        }

        Optional<TruckDimension> truckOpt = truckDimensionRepository.findById(driverState.truckId());
        if (truckOpt.isEmpty()) {
            return candidates;
        }

        TruckDimension truck = truckOpt.orElseThrow();
        Integer maxLength = truck.getLength();
        Integer maxWidth = truck.getWidth();
        Integer maxHeight = truck.getHeight();
        Double maxWeight = truck.getMaxWeightKg();

        return candidates.stream()
                .filter(q -> !exceeds(q.lengthCm(), maxLength))
                .filter(q -> !exceeds(q.widthCm(), maxWidth))
                .filter(q -> !exceeds(q.heightCm(), maxHeight))
                .filter(q -> !exceeds(q.weightKg(), maxWeight))
                .toList();
    }

    private boolean exceeds(Integer value, Integer limit) {
        return value != null && limit != null && value > limit;
    }

    private boolean exceeds(Double value, Double limit) {
        return value != null && limit != null && value > limit;
    }

    private Quote mapQuote(ResultSet rs) throws SQLException {
        return new Quote(
                rs.getLong("quote_id"),
                new Place(
                        null,
                        getString(rs, "origin_address"),
                        getDouble(rs, "origin_lat"),
                        getDouble(rs, "origin_lng")
                ),
                new Place(
                        null,
                        getString(rs, "destination_address"),
                        getDouble(rs, "destination_lat"),
                        getDouble(rs, "destination_lng")
                ),
                List.of(),
                getDouble(rs, "volume_cbm"),
                getDouble(rs, "weight_kg"),
                getBooleanObject(rs, "allow_combine"),
                getDouble(rs, "final_price"),
                getLocalDateTime(rs, "pickup_schedule_start"),
                getLocalDateTime(rs, "delivery_deadline"),
                getLocalDateTime(rs, "delivery_schedule"),
                null,
                null,
                null,
                true,
                true,
                false,
                false,
                false,
                null,
                getString(rs, "status"),
                List.of()
        );
    }

    private Quote mapQuoteMinimal(ResultSet rs) throws SQLException {
        return new Quote(
                rs.getLong("quote_id"),
                new Place(
                        null,
                        getString(rs, "origin_address"),
                        getDouble(rs, "origin_lat"),
                        getDouble(rs, "origin_lng")
                ),
                new Place(
                        null,
                        getString(rs, "destination_address"),
                        getDouble(rs, "destination_lat"),
                        getDouble(rs, "destination_lng")
                ),
                List.of(),
                getDouble(rs, "volume_cbm"),
                getDouble(rs, "weight_kg"),
                getBooleanObject(rs, "allow_combine"),
                getDouble(rs, "final_price"),
                null,
                null,
                getLocalDateTime(rs, "delivery_schedule"),
                null,
                null,
                null,
                true,
                true,
                false,
                false,
                false,
                null,
                getString(rs, "status"),
                List.of()
        );
    }

    private String getString(ResultSet rs, String column) {
        try {
            return rs.getString(column);
        } catch (SQLException e) {
            return null;
        }
    }

    private Double getDouble(ResultSet rs, String column) {
        try {
            Object value = rs.getObject(column);
            if (value == null) return null;
            if (value instanceof Number n) return n.doubleValue();
            return Double.parseDouble(String.valueOf(value));
        } catch (Exception e) {
            return null;
        }
    }

    private Boolean getBooleanObject(ResultSet rs, String column) {
        try {
            Object value = rs.getObject(column);
            if (value == null) return null;
            if (value instanceof Boolean b) return b;
            if (value instanceof Number n) return n.intValue() != 0;
            String s = String.valueOf(value).trim();
            if ("1".equals(s)) return true;
            if ("0".equals(s)) return false;
            return Boolean.parseBoolean(s);
        } catch (Exception e) {
            return null;
        }
    }

    private LocalDateTime getLocalDateTime(ResultSet rs, String column) {
        try {
            Timestamp ts = rs.getTimestamp(column);
            return ts != null ? ts.toLocalDateTime() : null;
        } catch (SQLException e) {
            return null;
        }
    }
}
