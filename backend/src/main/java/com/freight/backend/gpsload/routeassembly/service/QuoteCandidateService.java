package com.freight.backend.gpsmiss.routeassembly.service;

import com.freight.backend.entity.QuoteItem;
import com.freight.backend.gpsmiss.loadplan.model.CargoHandling;
import com.freight.backend.gpsmiss.loadplan.entity.TruckDimension;
import com.freight.backend.gpsmiss.route.model.Place;
import com.freight.backend.gpsmiss.routeassembly.model.DriverState;
import com.freight.backend.gpsmiss.routeassembly.model.Quote;
import com.freight.backend.gpsmiss.loadplan.repository.TruckDimensionRepository;
import com.freight.backend.repository.QuoteItemRepository;
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

    public QuoteCandidateService(
            JdbcTemplate jdbcTemplate,
            TruckDimensionRepository truckDimensionRepository,
            QuoteItemRepository quoteItemRepository
    ) {
        this.jdbcTemplate = jdbcTemplate;
        this.truckDimensionRepository = truckDimensionRepository;
        this.quoteItemRepository = quoteItemRepository;
    }

    public List<Quote> findOpenCandidates(DriverState driverState, int limit) {
        int effectiveLimit = limit > 0 ? limit : DEFAULT_LIMIT;
        String selectSql = """
                SELECT quote_id,
                       origin_address, origin_lat, origin_lng,
                       destination_address, destination_lat, destination_lng,
                       volume_cbm, weight_kg, allow_combine, final_price,
                       scheduled_date, length_cm, width_cm, height_cm, status,
                       rotatable, stackable, fragile, no_stack, bottom_only, max_stack_weight,
                       upright, easy_break
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
            raw = queryMinimalOpenCandidates(effectiveLimit);
        }
        List<Quote> withItems = applyQuoteItemsAggregation(raw);
        return applyTruckCapacityFilter(driverState, withItems);
    }

    private List<Quote> queryMinimalOpenCandidates(int limit) {
        String minimalSelectSql = """
                SELECT quote_id,
                       origin_address, origin_lat, origin_lng,
                       destination_address, destination_lat, destination_lng,
                       volume_cbm, weight_kg, allow_combine, final_price, status
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

        TruckDimension truck = truckOpt.get();
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
        if (vehicleType == null) return;
        where.append(" AND (vehicle_type IS NULL OR TRIM(vehicle_type) = '' OR LOWER(TRIM(vehicle_type)) = LOWER(TRIM(?)))");
        args.add(vehicleType);
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

        Integer maxLength = quote.lengthCm();
        Integer maxWidth = quote.widthCm();
        Integer maxHeight = quote.heightCm();

        boolean anyFragile = Boolean.TRUE.equals(quote.fragile());
        boolean anyNoStack = Boolean.TRUE.equals(quote.noStack());
        boolean anyBottomOnly = Boolean.TRUE.equals(quote.bottomOnly());
        boolean allRotatable = quote.rotatable() == null || quote.rotatable();
        boolean allStackable = quote.stackable() == null || quote.stackable();
        Double minMaxStackWeight = quote.maxStackWeight();

        Set<CargoHandling> handlingSet = new LinkedHashSet<>();
        if (quote.handling() != null) {
            handlingSet.addAll(quote.handling());
        }

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
                totalVolumeCbm > 0 ? totalVolumeCbm : quote.volumeCbm(),
                totalWeightKg > 0 ? totalWeightKg : quote.weightKg(),
                quote.allowCombine(),
                quote.finalPrice(),
                quote.scheduledDate(),
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

        TruckDimension truck = truckOpt.get();
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
        List<CargoHandling> handling = new ArrayList<>();
        if (getBoolean(rs, "upright")) {
            handling.add(CargoHandling.UPRIGHT);
        }
        if (getBoolean(rs, "fragile")) {
            handling.add(CargoHandling.FRAGILE);
        }
        if (getBoolean(rs, "easy_break")) {
            handling.add(CargoHandling.EASY_BREAK);
        }

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
                getDouble(rs, "volume_cbm"),
                getDouble(rs, "weight_kg"),
                getBooleanObject(rs, "allow_combine"),
                getDouble(rs, "final_price"),
                getLocalDateTime(rs, "scheduled_date"),
                getInt(rs, "length_cm"),
                getInt(rs, "width_cm"),
                getInt(rs, "height_cm"),
                getBooleanObject(rs, "rotatable"),
                getBooleanObject(rs, "stackable"),
                getBooleanObject(rs, "fragile"),
                getBooleanObject(rs, "no_stack"),
                getBooleanObject(rs, "bottom_only"),
                getDouble(rs, "max_stack_weight"),
                getString(rs, "status"),
                handling
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
                getDouble(rs, "volume_cbm"),
                getDouble(rs, "weight_kg"),
                getBooleanObject(rs, "allow_combine"),
                getDouble(rs, "final_price"),
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
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

    private Integer getInt(ResultSet rs, String column) {
        try {
            Object value = rs.getObject(column);
            if (value == null) return null;
            if (value instanceof Number n) return n.intValue();
            return Integer.parseInt(String.valueOf(value));
        } catch (Exception e) {
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

    private boolean getBoolean(ResultSet rs, String column) {
        Boolean b = getBooleanObject(rs, column);
        return b != null && b;
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
