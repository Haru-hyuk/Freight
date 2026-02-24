package com.freight.backend.service;
import com.freight.backend.dto.algorithm.LoadPlanPreviewRequest;
import com.freight.backend.dto.algorithm.RouteRecommendRequest;
import com.freight.backend.entity.Match;
import com.freight.backend.entity.Quote;
import com.freight.backend.entity.QuoteItem;
import com.freight.backend.entity.QuoteStop;
import com.freight.backend.entity.Truck;
import com.freight.backend.exception.CustomException;
import com.freight.backend.exception.ErrorCode;
import com.freight.backend.gpsmiss.loadplan.model.CargoItem;
import com.freight.backend.gpsmiss.loadplan.model.LoadPlanRequest;
import com.freight.backend.gpsmiss.loadplan.service.LoadPlanService;
import com.freight.backend.gpsmiss.route.model.Place;
import com.freight.backend.gpsmiss.routeassembly.model.DriverState;
import com.freight.backend.gpsmiss.routeassembly.model.RouteAssemblyRequest;
import com.freight.backend.gpsmiss.routeassembly.service.RouteAssemblyService;
import com.freight.backend.repository.MatchRepository;
import com.freight.backend.repository.QuoteItemRepository;
import com.freight.backend.repository.QuoteRepository;
import com.freight.backend.repository.QuoteStopRepository;
import com.freight.backend.repository.TruckRepository;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Collection;
import java.util.Comparator;
import java.util.HashSet;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

/**
 * 알고리즘 게이트웨이 서비스
 * - 경로 추천 (합짐/노선조립)
 * - 3D 적재 계획 미리보기
 */
@Service
@RequiredArgsConstructor
public class AlgorithmGatewayService {

    private static final Logger log = LoggerFactory.getLogger(AlgorithmGatewayService.class);

    private final QuoteRepository quoteRepository;
    private final QuoteItemRepository quoteItemRepository;
    private final TruckRepository truckRepository;
    private final MatchRepository matchRepository;
    private final QuoteStopRepository quoteStopRepository;
    private final RouteAssemblyService routeAssemblyService;
    private final LoadPlanService loadPlanService;

    @Value("${algorithm.gateway.default-max-pickup-distance-km:25.0}")
    private double defaultMaxPickupDistanceKm;

    @Value("${algorithm.gateway.max-candidate-quotes:80}")
    private int maxCandidateQuotes;

    /** 기사 위치 기반 최적 경로/합짐 추천 */
    public Object recommendRoutes(Long driverId, RouteRecommendRequest request) {
        Truck truck = resolveDriverTruck(driverId);
        List<Quote> openQuotes = quoteRepository.findByStatus("OPEN");

        List<Long> selectedQuoteIds = normalizeSelectedQuoteIds(request.getSelectedQuoteIds());
        if (!selectedQuoteIds.isEmpty()) {
            Set<Long> selectedIdSet = new HashSet<>(selectedQuoteIds);
            openQuotes = openQuotes.stream()
                    .filter(q -> q.getQuoteId() != null && selectedIdSet.contains(q.getQuoteId()))
                    .toList();
            if (openQuotes.isEmpty()) {
                throw new CustomException(ErrorCode.INVALID_REQUEST);
            }
        }

        Map<Long, List<QuoteItem>> itemsByQuoteId = fetchQuoteItems(openQuotes.stream().map(Quote::getQuoteId).toList());

        List<Map<String, Object>> candidates = new ArrayList<>();
        double loadedWeight = request.getLoadedWeightKg() == null ? 0.0 : Math.max(0.0, request.getLoadedWeightKg());
        double loadedVolume = request.getLoadedVolumeCbm() == null ? 0.0 : Math.max(0.0, request.getLoadedVolumeCbm());
        double truckMaxWeight = safeBigDecimal(truck.getMaxWeight(), 5000.0);
        double truckMaxVolume = safeBigDecimal(truck.getMaxVolume(), 10.0);
        double remainingWeight = Math.max(0.0, truckMaxWeight - loadedWeight);
        double remainingCbm = Math.max(0.0, truckMaxVolume - loadedVolume);
        double maxPickupDistanceKm = request.getMaxPickupDistanceKm() != null
                ? Math.max(0.0, request.getMaxPickupDistanceKm())
                : defaultMaxPickupDistanceKm;

        for (Quote q : openQuotes) {
            if (!isQuoteLocationValid(q)) {
                continue;
            }
            if (!isVehicleCompatible(truck, q)) {
                continue;
            }

            List<QuoteItem> quoteItems = itemsByQuoteId.getOrDefault(q.getQuoteId(), List.of());
            double quoteWeight = deriveQuoteWeightKg(q, quoteItems);
            double quoteCbm = deriveQuoteVolumeCbm(q, quoteItems);
            if (quoteWeight <= 0 || quoteCbm <= 0) {
                continue;
            }
            if (!isQuoteLoadCompatibleWithTruck(truck, q, quoteItems)) {
                continue;
            }
            if (quoteWeight > remainingWeight || quoteCbm > remainingCbm) {
                continue;
            }

            double pickupDistanceKm = haversineKm(
                    request.getCurrentLat(),
                    request.getCurrentLng(),
                    q.getOriginLat(),
                    q.getOriginLng()
            );
            if (pickupDistanceKm > maxPickupDistanceKm) {
                continue;
            }

            Map<String, Object> quote = new LinkedHashMap<>();
            quote.put("quoteId", q.getQuoteId());
            quote.put("origin", toPlacePayload(q.getOriginLat(), q.getOriginLng(), q.getOriginAddress()));
            quote.put("destination", toPlacePayload(q.getDestinationLat(), q.getDestinationLng(), q.getDestinationAddress()));
            quote.put("volumeCbm", quoteCbm);
            quote.put("weightKg", quoteWeight);
            quote.put("allowCombine", Boolean.TRUE.equals(q.getAllowCombine()));
            quote.put("finalPrice", safeDouble(q.getFinalPrice(), 0.0));
            quote.put("status", q.getStatus());
            quote.put("pickupDistanceKm", pickupDistanceKm);
            quote.put("itemCount", Math.max(1, totalItemCount(quoteItems)));
            quote.put("dataQuality", evaluateDataQuality(q, quoteItems));
            candidates.add(quote);
        }

        candidates.sort(Comparator.comparingDouble(c -> safeDouble((Number) c.get("pickupDistanceKm"), Double.MAX_VALUE)));
        if (candidates.size() > maxCandidateQuotes) {
            candidates = new ArrayList<>(candidates.subList(0, maxCandidateQuotes));
        }

        Map<String, Object> driverState = new LinkedHashMap<>();
        driverState.put("driverId", driverId);
        driverState.put("currentLocation", toPlacePayload(request.getCurrentLat(), request.getCurrentLng(), null));
        if (request.getEndLat() != null && request.getEndLng() != null) {
            driverState.put("endLocation", toPlacePayload(request.getEndLat(), request.getEndLng(), null));
        }
        driverState.put("remainingCbm", remainingCbm);
        driverState.put("remainingWeight", remainingWeight);
        driverState.put("combinePreference", normalizeCombinePreference(request.getCombinePreference()));
        driverState.put("truckId", truck.getTruckId());
        TransitState transitState = buildTransitState(driverId, request.getCurrentLat(), request.getCurrentLng());
        if (!transitState.inTransitCargos().isEmpty()) {
            driverState.put("inTransitCargos", transitState.inTransitCargos());
        }
        if (!transitState.remainingDeliveries().isEmpty()) {
            driverState.put("remainingDeliveries", transitState.remainingDeliveries());
        }
        if (transitState.availableAt() != null) {
            driverState.put("availableAt", transitState.availableAt());
        }

        // Map candidates를 Quote record로 변환
        List<com.freight.backend.gpsmiss.routeassembly.model.Quote> quoteList = candidates.stream()
                .map(this::toQuoteRecord)
                .toList();

        // DriverState 생성
        Place currentLocation = new Place(null, null, request.getCurrentLat(), request.getCurrentLng());
        Place endLocation = (request.getEndLat() != null && request.getEndLng() != null)
                ? new Place(null, null, request.getEndLat(), request.getEndLng()) : null;

        DriverState driverStateRecord = new DriverState(
                driverId, currentLocation, endLocation,
                remainingCbm, remainingWeight,
                parseCombinePreference(request.getCombinePreference()),
                truck.getTruckId()
        );

        // RouteAssemblyRequest 생성 및 직접 호출
        RouteAssemblyRequest assemblyRequest = new RouteAssemblyRequest(
                driverStateRecord, quoteList, null, selectedQuoteIds,
                parseRouteMode(request.getMode())
        );

        return routeAssemblyService.recommend(assemblyRequest);
    }

    /** 3D 적재 계획 미리보기 (LIFO 순서 기반) */
    public Object previewLoadPlan(Long driverId, LoadPlanPreviewRequest request) {
        Truck truck = resolveTruck(driverId, request.getTruckId());
        List<Quote> quotes = quoteRepository.findAllById(request.getQuoteIds());
        if (quotes.isEmpty()) {
            throw new CustomException(ErrorCode.INVALID_REQUEST);
        }

        Map<Long, Quote> quoteMap = quotes.stream().collect(Collectors.toMap(Quote::getQuoteId, Function.identity()));
        Map<Long, List<QuoteItem>> itemsByQuoteId = fetchQuoteItems(request.getQuoteIds());

        int[] dims = inferTruckDimensionsCm(truck);
        List<Map<String, Object>> items = new ArrayList<>();

        int stopOrder = 1;
        for (Long quoteId : request.getQuoteIds()) {
            Quote q = quoteMap.get(quoteId);
            if (q == null) {
                continue;
            }
            List<QuoteItem> quoteItems = itemsByQuoteId.getOrDefault(quoteId, List.of());
            if (quoteItems.isEmpty()) {
                items.addAll(expandQuoteToEstimatedItems(q, stopOrder));
            } else {
                items.addAll(expandQuoteItems(q, quoteItems, stopOrder));
            }
            stopOrder++;
        }

        if (items.isEmpty()) {
            throw new CustomException(ErrorCode.INVALID_REQUEST);
        }

        // items를 CargoItem record로 변환
        List<CargoItem> cargoItems = items.stream()
                .map(this::toCargoItemRecord)
                .toList();

        // Truck record 생성
        com.freight.backend.gpsmiss.loadplan.model.Truck truckModel = new com.freight.backend.gpsmiss.loadplan.model.Truck(
                truck.getTruckId(), dims[0], dims[1], dims[2],
                safeBigDecimal(truck.getMaxWeight(), 5000.0),
                inferDoorPosition(truck.getVehicleBodyType())
        );

        LoadPlanRequest loadRequest = new LoadPlanRequest(truckModel, cargoItems);
        return loadPlanService.plan(loadRequest);
    }

    private Map<Long, List<QuoteItem>> fetchQuoteItems(Collection<Long> quoteIds) {
        if (quoteIds == null || quoteIds.isEmpty()) {
            return Map.of();
        }
        List<QuoteItem> allItems = quoteItemRepository.findByQuoteIdIn(quoteIds);
        Map<Long, List<QuoteItem>> grouped = new HashMap<>();
        for (QuoteItem item : allItems) {
            grouped.computeIfAbsent(item.getQuoteId(), k -> new ArrayList<>()).add(item);
        }
        return grouped;
    }

    private List<Map<String, Object>> expandQuoteItems(Quote quote, List<QuoteItem> quoteItems, int stopOrder) {
        List<Map<String, Object>> items = new ArrayList<>();
        for (QuoteItem qi : quoteItems) {
            int quantity = Math.max(1, qi.getQuantity() == null ? 1 : qi.getQuantity());
            int[] dims = resolveDimensionsFromQuoteItem(qi);
            double unitWeight = qi.getUnitWeightKg() != null && qi.getUnitWeightKg() > 0
                    ? qi.getUnitWeightKg()
                    : deriveWeightFromDimensions(dims);
            boolean fragile = Boolean.TRUE.equals(qi.getFragile()) || containsHandlingTag(qi.getHandlingTags(), "FRAGILE")
                    || containsHandlingTag(qi.getHandlingTags(), "EASY_BREAK");
            boolean upright = Boolean.TRUE.equals(qi.getUpright()) || containsHandlingTag(qi.getHandlingTags(), "UPRIGHT");
            boolean noStack = Boolean.TRUE.equals(qi.getNoStack());
            boolean bottomOnly = Boolean.TRUE.equals(qi.getBottomOnly());
            boolean rotatable = upright ? false : !Boolean.FALSE.equals(qi.getRotatable());
            boolean stackable = noStack ? false : !Boolean.FALSE.equals(qi.getStackable());

            for (int i = 0; i < quantity; i++) {
                Map<String, Object> item = new LinkedHashMap<>();
                item.put("id", "QI-" + qi.getQuoteItemId() + "-" + (i + 1));
                item.put("length", dims[0]);
                item.put("width", dims[1]);
                item.put("height", dims[2]);
                item.put("weight", unitWeight);
                item.put("stopOrder", stopOrder);
                item.put("rotatable", rotatable);
                item.put("stackable", stackable);
                item.put("fragile", fragile);
                item.put("noStack", noStack);
                item.put("bottomOnly", bottomOnly);
                if (qi.getMaxStackWeightKg() != null && qi.getMaxStackWeightKg() > 0) {
                    item.put("maxStackWeight", qi.getMaxStackWeightKg());
                }
                items.add(item);
            }
        }
        if (items.isEmpty()) {
            items.addAll(expandQuoteToEstimatedItems(quote, stopOrder));
        }
        return items;
    }

    private List<Map<String, Object>> expandQuoteToEstimatedItems(Quote quote, int stopOrder) {
        double totalCbm = safeDouble(quote.getVolumeCbm(), 1.0);
        double totalWeight = safeDouble(quote.getWeightKg(), 50.0);
        int pieces = Math.max(1, (int) Math.ceil(totalCbm / 2.0));
        double pieceCbm = Math.max(0.2, totalCbm / pieces);
        double pieceWeight = Math.max(5.0, totalWeight / pieces);

        List<Map<String, Object>> items = new ArrayList<>();
        for (int i = 0; i < pieces; i++) {
            int[] cargoDims = inferCargoDimensionsFromCbm(pieceCbm);
            Map<String, Object> item = new LinkedHashMap<>();
            item.put("id", "Q-" + quote.getQuoteId() + "-" + (i + 1));
            item.put("length", cargoDims[0]);
            item.put("width", cargoDims[1]);
            item.put("height", cargoDims[2]);
            item.put("weight", pieceWeight);
            item.put("stopOrder", stopOrder);
            item.put("rotatable", true);
            item.put("stackable", true);
            item.put("fragile", false);
            item.put("noStack", false);
            item.put("bottomOnly", false);
            items.add(item);
        }
        return items;
    }

    private int[] resolveDimensionsFromQuoteItem(QuoteItem item) {
        Integer l = item.getLengthCm();
        Integer w = item.getWidthCm();
        Integer h = item.getHeightCm();
        if (l != null && l > 0 && w != null && w > 0 && h != null && h > 0) {
            return new int[]{l, w, h};
        }
        if (item.getUnitVolumeCbm() != null && item.getUnitVolumeCbm() > 0) {
            return inferCargoDimensionsFromCbm(item.getUnitVolumeCbm());
        }
        return new int[]{100, 80, 60};
    }

    private double deriveWeightFromDimensions(int[] dimsCm) {
        double approxCbm = (dimsCm[0] * dimsCm[1] * dimsCm[2]) / 1_000_000.0;
        return Math.max(5.0, approxCbm * 120.0);
    }

    private boolean containsHandlingTag(String tags, String target) {
        if (tags == null || tags.isBlank()) {
            return false;
        }
        return tags.toUpperCase(Locale.ROOT).contains(target.toUpperCase(Locale.ROOT));
    }

    private boolean isQuoteLocationValid(Quote q) {
        return q.getOriginLat() != null
                && q.getOriginLng() != null
                && q.getDestinationLat() != null
                && q.getDestinationLng() != null;
    }

    private boolean isVehicleCompatible(Truck truck, Quote quote) {
        if (!isVehicleTypeCompatible(truck, quote)) {
            return false;
        }
        if (!isTonnageCompatible(truck, quote)) {
            return false;
        }
        return isVehicleBodyCompatible(truck, quote);
    }

    private boolean isVehicleTypeCompatible(Truck truck, Quote quote) {
        String required = normalizeVehicleType(quote.getVehicleType());
        if (required == null) {
            return true;
        }

        String actual = normalizeVehicleType(truck.getVehicleType());
        if (actual == null) {
            return true;
        }

        if (required.equals(actual)) {
            return true;
        }

        Double requiredTon = parseTonnageFromType(required);
        Double actualTon = parseTonnageFromType(actual);
        return requiredTon != null && actualTon != null && actualTon + 1e-9 >= requiredTon;
    }

    private boolean isTonnageCompatible(Truck truck, Quote quote) {
        Double required = parseTonnageFromType(quote.getVehicleType());
        if (required == null) {
            return true;
        }
        double truckTon = truck.getTonnage() == null ? 0.0 : truck.getTonnage().doubleValue();
        return truckTon <= 0.0 || truckTon + 1e-9 >= required;
    }

    private boolean isVehicleBodyCompatible(Truck truck, Quote quote) {
        String requested = normalizeBodyType(quote.getVehicleBodyType());
        if (requested == null) {
            return true;
        }
        String truckBody = normalizeBodyType(truck.getVehicleBodyType());
        if (truckBody == null) {
            return true;
        }
        return requested.equals(truckBody);
    }

    private String normalizeVehicleType(String vehicleType) {
        if (vehicleType == null || vehicleType.isBlank()) {
            return null;
        }
        return vehicleType.trim()
                .toLowerCase(Locale.ROOT)
                .replace(" ", "")
                .replace("_", "")
                .replace("-", "");
    }

    private String normalizeBodyType(String bodyType) {
        if (bodyType == null || bodyType.isBlank()) {
            return null;
        }
        String normalized = bodyType.trim().toLowerCase(Locale.ROOT)
                .replace(" ", "")
                .replace("_", "")
                .replace("-", "");
        if ("wing".equals(normalized) || "wingbody".equals(normalized)) return "wingbody";
        if ("cargotruck".equals(normalized) || "general".equals(normalized)) return "cargo";
        if ("topopen".equals(normalized) || "topload".equals(normalized)) return "top";
        if ("side".equals(normalized)) return "side_both";
        return normalized;
    }

    private double deriveQuoteWeightKg(Quote q, List<QuoteItem> quoteItems) {
        if (quoteItems != null && !quoteItems.isEmpty()) {
            double itemWeight = quoteItems.stream()
                    .filter(item -> item.getUnitWeightKg() != null && item.getUnitWeightKg() > 0)
                    .mapToDouble(item -> item.getUnitWeightKg() * Math.max(1, item.getQuantity() == null ? 1 : item.getQuantity()))
                    .sum();
            if (itemWeight > 0) {
                return itemWeight;
            }
        }
        return safeDouble(q.getWeightKg(), 0.0);
    }

    private double deriveQuoteVolumeCbm(Quote q, List<QuoteItem> quoteItems) {
        if (quoteItems != null && !quoteItems.isEmpty()) {
            double itemCbm = quoteItems.stream()
                    .filter(item -> item.getUnitVolumeCbm() != null && item.getUnitVolumeCbm() > 0)
                    .mapToDouble(item -> item.getUnitVolumeCbm() * Math.max(1, item.getQuantity() == null ? 1 : item.getQuantity()))
                    .sum();
            if (itemCbm > 0) {
                return itemCbm;
            }
        }
        return safeDouble(q.getVolumeCbm(), 0.0);
    }

    private int totalItemCount(List<QuoteItem> quoteItems) {
        if (quoteItems == null || quoteItems.isEmpty()) {
            return 1;
        }
        return quoteItems.stream()
                .mapToInt(item -> Math.max(1, item.getQuantity() == null ? 1 : item.getQuantity()))
                .sum();
    }

    private Truck resolveDriverTruck(Long driverId) {
        return truckRepository.findByDriverId(driverId).stream().findFirst()
                .orElseThrow(() -> new CustomException(ErrorCode.DRIVER_TRUCK_REQUIRED));
    }

    private Truck resolveTruck(Long driverId, Long truckId) {
        if (truckId != null) {
            Truck truck = truckRepository.findById(truckId)
                    .orElseThrow(() -> new CustomException(ErrorCode.INVALID_REQUEST));
            if (!truck.getDriverId().equals(driverId)) {
                throw new CustomException(ErrorCode.AUTH_FORBIDDEN);
            }
            return truck;
        }
        return resolveDriverTruck(driverId);
    }

    private double safeDouble(Number value, double fallback) {
        return value == null ? fallback : value.doubleValue();
    }

    private double safeBigDecimal(BigDecimal value, double fallback) {
        return value == null ? fallback : value.doubleValue();
    }

    private String normalizeCombinePreference(String raw) {
        if (raw == null || raw.isBlank()) {
            return "ALLOW";
        }
        String normalized = raw.trim().toUpperCase(Locale.ROOT);
        if ("DISALLOW".equals(normalized) || "HOME_ROUTE".equals(normalized) || "ALLOW".equals(normalized)) {
            return normalized;
        }
        return "ALLOW";
    }

    private String normalizeMode(String raw) {
        if (raw == null || raw.isBlank()) {
            return "SMART";
        }
        String normalized = raw.trim().toUpperCase(Locale.ROOT);
        return "SIMPLE".equals(normalized) ? "SIMPLE" : "SMART";
    }

    private int[] inferCargoDimensionsFromCbm(double cbm) {
        double cm3 = Math.max(0.05, cbm) * 1_000_000.0;
        double base = Math.cbrt(cm3 / 1.2);
        int l = Math.max(35, (int) Math.round(base * 1.3));
        int w = Math.max(30, (int) Math.round(base * 1.0));
        int h = Math.max(25, (int) Math.round(base * 0.8));
        return new int[]{l, w, h};
    }

    private int[] inferTruckDimensionsCm(Truck truck) {
        int l = toPositiveInt(truck.getCargoLength());
        int w = toPositiveInt(truck.getCargoWidth());
        int h = toPositiveInt(truck.getCargoHeight());
        if (l > 0 && w > 0 && h > 0) {
            return new int[]{l, w, h};
        }
        double tonnage = truck.getTonnage() == null ? 1.0 : truck.getTonnage().doubleValue();
        if (tonnage <= 1.0) return new int[]{310, 160, 170};
        if (tonnage <= 2.5) return new int[]{430, 200, 200};
        if (tonnage <= 5.0) return new int[]{620, 230, 230};
        return new int[]{960, 240, 250};
    }

    private String inferDoorPosition(String bodyType) {
        if (bodyType == null) return "rear";
        String normalized = normalizeBodyType(bodyType);
        if ("wingbody".equals(normalized)) return "side_both";
        if ("cargo".equals(normalized)) return "top";
        if ("left".equals(normalized) || "right".equals(normalized) || "top".equals(normalized) || "side_both".equals(normalized)) {
            return normalized;
        }
        return "rear";
    }

    private boolean isQuoteLoadCompatibleWithTruck(Truck truck, Quote quote, List<QuoteItem> quoteItems) {
        int[] truckDims = inferTruckDimensionsCm(truck);
        double truckMaxWeight = safeBigDecimal(truck.getMaxWeight(), 5000.0);

        if (quoteItems == null || quoteItems.isEmpty()) {
            return true;
        }

        for (QuoteItem qi : quoteItems) {
            int[] dims = resolveDimensionsFromQuoteItem(qi);
            boolean upright = Boolean.TRUE.equals(qi.getUpright()) || containsHandlingTag(qi.getHandlingTags(), "UPRIGHT");
            boolean rotatable = upright ? false : !Boolean.FALSE.equals(qi.getRotatable());
            if (!canFitInTruck(dims, truckDims, rotatable)) {
                return false;
            }
            if (qi.getUnitWeightKg() != null && qi.getUnitWeightKg() > truckMaxWeight) {
                return false;
            }
        }
        return true;
    }

    /** 화물이 트럭에 적재 가능한지 확인 (회전 고려) */
    private boolean canFitInTruck(int[] item, int[] truck, boolean rotatable) {
        int il = item[0], iw = item[1], ih = item[2];
        int tl = truck[0], tw = truck[1], th = truck[2];

        if (!rotatable) {
            return il <= tl && iw <= tw && ih <= th;
        }

        int[][] perms = new int[][]{
                {il, iw, ih}, {il, ih, iw}, {iw, il, ih},
                {iw, ih, il}, {ih, il, iw}, {ih, iw, il}
        };
        for (int[] p : perms) {
            if (p[0] <= tl && p[1] <= tw && p[2] <= th) {
                return true;
            }
        }
        return false;
    }

    private double evaluateDataQuality(Quote q, List<QuoteItem> quoteItems) {
        double score = 0.0;
        if (q.getOriginLat() != null && q.getOriginLng() != null && q.getDestinationLat() != null && q.getDestinationLng() != null) {
            score += 0.35;
        }
        if (q.getFinalPrice() != null && q.getFinalPrice() > 0) {
            score += 0.15;
        }
        if (quoteItems != null && !quoteItems.isEmpty()) {
            score += 0.5;
            long completeDims = quoteItems.stream()
                    .filter(i -> i.getLengthCm() != null && i.getLengthCm() > 0
                            && i.getWidthCm() != null && i.getWidthCm() > 0
                            && i.getHeightCm() != null && i.getHeightCm() > 0)
                    .count();
            if (completeDims < quoteItems.size()) {
                score -= 0.2;
            }
        }
        return Math.max(0.0, Math.min(1.0, score));
    }

    /** 현재 운송 중인 화물 상태 조회 (추가 합짐 계산용) */
    private TransitState buildTransitState(Long driverId, double currentLat, double currentLng) {
        List<Match> inTransitMatches = matchRepository.findByDriverIdAndStatus(driverId, Match.Status.IN_TRANSIT);
        if (inTransitMatches.isEmpty()) {
            return TransitState.empty();
        }

        List<Long> quoteIds = inTransitMatches.stream()
                .map(Match::getQuoteId)
                .filter(id -> id != null && id > 0)
                .distinct()
                .toList();
        Map<Long, Quote> quoteById = quoteRepository.findAllById(quoteIds).stream()
                .collect(Collectors.toMap(Quote::getQuoteId, Function.identity()));
        Map<Long, List<QuoteItem>> itemsByQuote = fetchQuoteItems(quoteIds);

        List<Map<String, Object>> inTransitCargos = new ArrayList<>();
        List<Map<String, Object>> remainingDeliveries = new ArrayList<>();

        for (Long quoteId : quoteIds) {
            Quote q = quoteById.get(quoteId);
            if (q == null) {
                continue;
            }
            List<QuoteItem> items = itemsByQuote.getOrDefault(quoteId, List.of());
            inTransitCargos.add(Map.of(
                    "quoteId", quoteId,
                    "weightKg", deriveQuoteWeightKg(q, items),
                    "volumeCbm", deriveQuoteVolumeCbm(q, items)
            ));

            List<QuoteStop> stops = quoteStopRepository.findByQuoteIdOrderBySeqAsc(quoteId);
            boolean addedStop = false;
            for (QuoteStop stop : stops) {
                if (stop.getLat() == null || stop.getLng() == null) {
                    continue;
                }
                Map<String, Object> stopPayload = new LinkedHashMap<>();
                stopPayload.put("quoteId", quoteId);
                stopPayload.put("seq", stop.getSeq());
                stopPayload.putAll(toPlacePayload(stop.getLat(), stop.getLng(), stop.getAddress()));
                remainingDeliveries.add(stopPayload);
                addedStop = true;
            }

            if (!addedStop && q.getDestinationLat() != null && q.getDestinationLng() != null) {
                Map<String, Object> fallbackStop = new LinkedHashMap<>();
                fallbackStop.put("quoteId", quoteId);
                fallbackStop.putAll(toPlacePayload(q.getDestinationLat(), q.getDestinationLng(), q.getDestinationAddress()));
                remainingDeliveries.add(fallbackStop);
            }
        }

        String availableAt = estimateAvailableAtIso(currentLat, currentLng, remainingDeliveries);
        return new TransitState(inTransitCargos, remainingDeliveries, availableAt);
    }

    private String estimateAvailableAtIso(double currentLat, double currentLng, List<Map<String, Object>> remainingDeliveries) {
        if (remainingDeliveries == null || remainingDeliveries.isEmpty()) {
            return null;
        }

        double cursorLat = currentLat;
        double cursorLng = currentLng;
        long minutes = 0L;
        for (Map<String, Object> stop : remainingDeliveries) {
            Double lat = asDouble(stop.get("lat"));
            Double lng = asDouble(stop.get("lng"));
            if (lat == null || lng == null) {
                continue;
            }
            double distKm = haversineKm(cursorLat, cursorLng, lat, lng) * 1.3;
            minutes += (long) Math.ceil((distKm / 40.0) * 60.0);
            minutes += 10L;
            cursorLat = lat;
            cursorLng = lng;
        }

        return LocalDateTime.now().plusMinutes(minutes).toString();
    }

    private Double asDouble(Object value) {
        if (value instanceof Number number) {
            return number.doubleValue();
        }
        return null;
    }

    private Map<String, Object> toPlacePayload(Double lat, Double lng, String address) {
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("latitude", lat);
        payload.put("longitude", lng);
        // 하위 호환: 기존 프론트/로그 포맷을 같이 유지
        payload.put("lat", lat);
        payload.put("lng", lng);
        if (address != null && !address.isBlank()) {
            payload.put("address", address);
        }
        return payload;
    }

    private List<Long> normalizeSelectedQuoteIds(List<Long> selectedQuoteIds) {
        if (selectedQuoteIds == null || selectedQuoteIds.isEmpty()) {
            return List.of();
        }
        return selectedQuoteIds.stream()
                .filter(id -> id != null && id > 0)
                .distinct()
                .toList();
    }

    private Double parseTonnageFromType(String vehicleType) {
        if (vehicleType == null || vehicleType.isBlank()) {
            return null;
        }

        String normalized = vehicleType.toLowerCase(Locale.ROOT);
        if (normalized.contains("25") || normalized.contains("2.5")) return 2.5;
        if (normalized.contains("11") || normalized.contains("1.1")) return 1.1;
        if (normalized.contains("15") || normalized.contains("1.5")) return 1.5;
        if (normalized.contains("35") || normalized.contains("3.5")) return 3.5;
        if (normalized.contains("50") || normalized.contains("5.0")) return 5.0;
        if (normalized.contains("1")) return 1.0;
        return null;
    }

    private record TransitState(
            List<Map<String, Object>> inTransitCargos,
            List<Map<String, Object>> remainingDeliveries,
            String availableAt
    ) {
        private static TransitState empty() {
            return new TransitState(List.of(), List.of(), null);
        }
    }

    private int toPositiveInt(BigDecimal value) {
        if (value == null || value.doubleValue() <= 0) {
            return 0;
        }
        return (int) Math.round(value.doubleValue());
    }

    /** 두 좌표 간 직선 거리 계산 (Haversine 공식) */
    private double haversineKm(double lat1, double lng1, double lat2, double lng2) {
        final double earthRadiusKm = 6371.0;
        double dLat = Math.toRadians(lat2 - lat1);
        double dLng = Math.toRadians(lng2 - lng1);
        double a = Math.sin(dLat / 2) * Math.sin(dLat / 2)
                + Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2))
                * Math.sin(dLng / 2) * Math.sin(dLng / 2);
        double c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return earthRadiusKm * c;
    }

    @SuppressWarnings("unchecked")
    private com.freight.backend.gpsmiss.routeassembly.model.Quote toQuoteRecord(Map<String, Object> map) {
        Long quoteId = map.get("quoteId") instanceof Number n ? n.longValue() : null;

        Map<String, Object> originMap = (Map<String, Object>) map.get("origin");
        Map<String, Object> destMap = (Map<String, Object>) map.get("destination");

        Place origin = toPlace(originMap);
        Place destination = toPlace(destMap);

        Double volumeCbm = asDoubleOrNull(map.get("volumeCbm"));
        Double weightKg = asDoubleOrNull(map.get("weightKg"));
        Boolean allowCombine = map.get("allowCombine") instanceof Boolean b ? b : null;
        Double finalPrice = asDoubleOrNull(map.get("finalPrice"));
        String status = map.get("status") instanceof String s ? s : null;

        return new com.freight.backend.gpsmiss.routeassembly.model.Quote(
                quoteId, origin, destination, volumeCbm, weightKg, allowCombine, finalPrice,
                null, null, null, null, null, null, null, null, null, null, status, null
        );
    }

    private Place toPlace(Map<String, Object> map) {
        if (map == null) return null;
        Double lat = asDoubleOrNull(map.get("latitude"));
        if (lat == null) lat = asDoubleOrNull(map.get("lat"));
        Double lng = asDoubleOrNull(map.get("longitude"));
        if (lng == null) lng = asDoubleOrNull(map.get("lng"));
        String address = map.get("address") instanceof String s ? s : null;
        return new Place(null, address, lat, lng);
    }

    private Double asDoubleOrNull(Object value) {
        if (value instanceof Number n) return n.doubleValue();
        return null;
    }

    private CargoItem toCargoItemRecord(Map<String, Object> map) {
        String id = map.get("id") instanceof String s ? s : "unknown";
        int length = map.get("length") instanceof Number n ? n.intValue() : 100;
        int width = map.get("width") instanceof Number n ? n.intValue() : 80;
        int height = map.get("height") instanceof Number n ? n.intValue() : 60;
        double weight = map.get("weight") instanceof Number n ? n.doubleValue() : 50.0;
        Integer stopOrder = map.get("stopOrder") instanceof Number n ? n.intValue() : 1;
        Boolean rotatable = map.get("rotatable") instanceof Boolean b ? b : true;
        Boolean stackable = map.get("stackable") instanceof Boolean b ? b : true;
        Boolean fragile = map.get("fragile") instanceof Boolean b ? b : false;
        Boolean noStack = map.get("noStack") instanceof Boolean b ? b : false;
        Boolean bottomOnly = map.get("bottomOnly") instanceof Boolean b ? b : false;
        Double maxStackWeight = map.get("maxStackWeight") instanceof Number n ? n.doubleValue() : null;

        return new CargoItem(id, length, width, height, weight, stopOrder, rotatable, stackable, fragile, noStack, bottomOnly, maxStackWeight, null);
    }

    private DriverState.CombinePreference parseCombinePreference(String raw) {
        if (raw == null || raw.isBlank()) {
            return DriverState.CombinePreference.ALLOW;
        }
        String normalized = raw.trim().toUpperCase(Locale.ROOT);
        return switch (normalized) {
            case "DISALLOW" -> DriverState.CombinePreference.DISALLOW;
            case "HOME_ROUTE" -> DriverState.CombinePreference.HOME_ROUTE;
            default -> DriverState.CombinePreference.ALLOW;
        };
    }

    private RouteAssemblyRequest.RouteMode parseRouteMode(String raw) {
        if (raw == null || raw.isBlank()) {
            return RouteAssemblyRequest.RouteMode.SMART;
        }
        String normalized = raw.trim().toUpperCase(Locale.ROOT);
        return "SIMPLE".equals(normalized) ? RouteAssemblyRequest.RouteMode.SIMPLE : RouteAssemblyRequest.RouteMode.SMART;
    }
}
