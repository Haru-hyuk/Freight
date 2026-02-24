package com.freight.backend.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.freight.backend.gpsmiss.loadplan.entity.TruckSpecCatalog;
import com.freight.backend.gpsmiss.loadplan.repository.TruckSpecCatalogRepository;
import com.freight.backend.pricing.PricingRateCatalog;
import com.freight.backend.pricing.PricingRateCatalogRepository;
import java.io.IOException;
import java.io.InputStream;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/**
 * 기준표 JSON을 DB 기준 테이블로 업서트하는 스타트업 부트스트랩.
 * - truck_spec_catalog
 * - pricing_rate_catalog
 */
@Component
public class ReferenceCatalogBootstrapService implements CommandLineRunner {

    private static final Logger log = LoggerFactory.getLogger(ReferenceCatalogBootstrapService.class);
    private static final Pattern RANGE_KEY_PATTERN = Pattern.compile("^KM_(\\d+)_(\\d+)$");

    private final ObjectMapper objectMapper = new ObjectMapper();
    private final TruckSpecCatalogRepository truckSpecCatalogRepository;
    private final PricingRateCatalogRepository pricingRateCatalogRepository;

    public ReferenceCatalogBootstrapService(
            TruckSpecCatalogRepository truckSpecCatalogRepository,
            PricingRateCatalogRepository pricingRateCatalogRepository
    ) {
        this.truckSpecCatalogRepository = truckSpecCatalogRepository;
        this.pricingRateCatalogRepository = pricingRateCatalogRepository;
    }

    @Value("${catalog.bootstrap.enabled:true}")
    private boolean enabled;

    @Value("${catalog.bootstrap.truck-spec-json:}")
    private String truckSpecJsonPath;

    @Value("${catalog.bootstrap.pricing-json:}")
    private String pricingJsonPath;

    @Override
    @Transactional
    public void run(String... args) {
        if (!enabled) {
            log.info("Reference catalog bootstrap disabled");
            return;
        }
        try {
            upsertPricingRates();
            upsertTruckSpecs();
        } catch (Exception e) {
            // 참조 카탈로그 적재 실패로 서버 전체 기동이 중단되지 않도록 보호
            log.error("Reference catalog bootstrap failed, continue startup: {}", e.getMessage(), e);
        }
    }

    private void upsertPricingRates() {
        JsonNode root = readJsonWithFallback(
                pricingJsonPath,
                "pricing_rate_table.json",
                List.of(Paths.get("docs", "pricing_rate_table.json"), Paths.get("backend", "docs", "pricing_rate_table.json"))
        );
        if (root == null || !root.path("ranges").isObject()) {
            log.warn("pricing_rate_table.json 로드 실패: pricing_rate_catalog 업서트 생략");
            return;
        }

        int upserted = 0;
        String sourceName = resolveSourceName(
                pricingJsonPath,
                List.of(Paths.get("docs", "pricing_rate_table.json"), Paths.get("backend", "docs", "pricing_rate_table.json")),
                "classpath:pricing_rate_table.json"
        );

        for (Map.Entry<String, JsonNode> rangeEntry : root.path("ranges").properties()) {
            String rangeKey = rangeEntry.getKey();
            Matcher m = RANGE_KEY_PATTERN.matcher(rangeKey);
            if (!m.matches()) {
                continue;
            }

            int minKm = Integer.parseInt(m.group(1));
            int maxKm = Integer.parseInt(m.group(2));
            JsonNode rateNode = rangeEntry.getValue();
            if (!rateNode.isObject()) {
                continue;
            }

            for (Map.Entry<String, JsonNode> vehicleRate : rateNode.properties()) {
                if (!vehicleRate.getValue().canConvertToInt()) {
                    continue;
                }
                String vehicleType = vehicleRate.getKey().trim().toUpperCase();
                int baseRate = vehicleRate.getValue().asInt();

                PricingRateCatalog entity = pricingRateCatalogRepository
                        .findByRangeKeyAndVehicleType(rangeKey, vehicleType)
                        .orElseGet(() -> PricingRateCatalog.create(rangeKey, vehicleType));
                entity.applyData(minKm, maxKm, baseRate, sourceName);
                pricingRateCatalogRepository.save(entity);
                upserted++;
            }
        }

        log.info("pricing_rate_catalog 업서트 완료: {} rows", upserted);
    }

    private void upsertTruckSpecs() {
        JsonNode root = readJsonWithFallback(
                truckSpecJsonPath,
                "truck_specifications.json",
                List.of(Paths.get("docs", "truck_specifications.json"), Paths.get("backend", "docs", "truck_specifications.json"))
        );

        int upserted;
        String sourceName;
        if (root != null && root.path("trucks").isArray() && root.path("trucks").size() > 0) {
            sourceName = resolveSourceName(
                    truckSpecJsonPath,
                    List.of(Paths.get("docs", "truck_specifications.json"), Paths.get("backend", "docs", "truck_specifications.json")),
                    "classpath:truck_specifications.json"
            );
            upserted = upsertTruckSpecsFromJson(root.path("trucks"), sourceName);
        } else {
            // docs JSON이 깨졌거나 누락된 환경에서도 기준표가 비지 않도록 기본값 적재
            sourceName = "generated-fallback-standard";
            upserted = upsertTruckSpecsFromFallback(sourceName);
            log.warn("truck_specifications.json 파싱 실패로 fallback 기준표를 적재했습니다.");
        }

        log.info("truck_spec_catalog 업서트 완료: {} rows", upserted);
    }

    private int upsertTruckSpecsFromJson(JsonNode trucksNode, String sourceName) {
        int upserted = 0;
        for (JsonNode node : trucksNode) {
            String vehicleType = text(node, "type").toUpperCase();
            String vehicleTypeKr = text(node, "type_kr");
            String categoryKr = text(node, "category");
            String vehicleBodyType = normalizeVehicleBodyType(categoryKr);
            String vehicleModel = resolveVehicleModel(vehicleType, vehicleTypeKr, categoryKr, vehicleBodyType);
            String doorPosition = resolveDoorPosition(vehicleBodyType);

            int lengthMm = node.path("cargo_dimensions").path("length_mm").asInt(0);
            int widthMm = node.path("cargo_dimensions").path("width_mm").asInt(0);
            int heightMm = node.path("cargo_dimensions").path("height_mm").asInt(0);
            if (vehicleType.isBlank() || lengthMm <= 0 || widthMm <= 0 || heightMm < 0) {
                continue;
            }

            BigDecimal tonnage = resolveTonnage(vehicleType, node.path("max_weight_kg").asDouble(0));
            BigDecimal maxWeight = BigDecimal.valueOf(node.path("max_weight_kg").asDouble(0)).setScale(2, RoundingMode.HALF_UP);
            String maxWeightDisplay = text(node, "max_weight_display");
            Integer palletCount = node.path("pallet").path("count").isMissingNode() ? null : node.path("pallet").path("count").asInt();
            String palletStandardMm = text(node.path("pallet"), "standard_mm");

            BigDecimal lengthCm = mmToCm(lengthMm);
            BigDecimal widthCm = mmToCm(widthMm);
            BigDecimal heightCm = mmToCm(heightMm);
            BigDecimal maxVolume = calcVolumeCbm(lengthCm, widthCm, heightCm);

            upsertTruckSpecRow(
                    vehicleType,
                    vehicleTypeKr,
                    categoryKr,
                    vehicleBodyType,
                    vehicleModel,
                    tonnage,
                    maxWeight,
                    maxWeightDisplay,
                    maxVolume,
                    lengthCm,
                    widthCm,
                    heightCm,
                    palletCount,
                    palletStandardMm,
                    doorPosition,
                    sourceName
            );
            upserted++;
        }
        return upserted;
    }

    private int upsertTruckSpecsFromFallback(String sourceName) {
        List<String> categories = List.of("카고", "윙바디", "리프트", "냉동/탑", "무진동");

        Map<String, BaseTruckSeed> seeds = new LinkedHashMap<>();
        seeds.put("DAMAS", new BaseTruckSeed("다마스", 1700, 1100, 1100, 400, "0.4t", 0, false));
        seeds.put("LABO", new BaseTruckSeed("라보", 2200, 1400, 1400, 500, "0.5t", 1, false));
        seeds.put("TON_1", new BaseTruckSeed("1톤", 2850, 1600, 1700, 1000, "1t", 2, true));
        seeds.put("TON_1_4", new BaseTruckSeed("1.4톤", 3300, 1700, 1800, 1400, "1.4t", 3, true));
        seeds.put("TON_2_5", new BaseTruckSeed("2.5톤", 4300, 1800, 2000, 2500, "2.5t", 3, true));
        seeds.put("TON_3_5", new BaseTruckSeed("3.5톤", 5100, 2100, 2200, 3500, "3.5t", 4, true));
        seeds.put("TON_5", new BaseTruckSeed("5톤", 6200, 2350, 2400, 5000, "5t", 8, true));
        seeds.put("TON_5_AXLE", new BaseTruckSeed("5톤 축차", 8500, 2350, 2400, 5000, "5t", 12, true));
        seeds.put("TON_8", new BaseTruckSeed("8톤", 7200, 2350, 2400, 8000, "8t", 10, true));
        seeds.put("TON_11", new BaseTruckSeed("11톤", 9100, 2350, 2400, 11000, "11t", 14, true));
        seeds.put("TON_14", new BaseTruckSeed("14톤", 9100, 2400, 2500, 14000, "14t", 16, true));
        seeds.put("TON_15", new BaseTruckSeed("15톤", 9100, 2400, 2500, 15000, "16t", 16, true));
        seeds.put("TON_18", new BaseTruckSeed("18톤", 10000, 2400, 2500, 18000, "19t", 18, true));
        seeds.put("TON_25", new BaseTruckSeed("25톤", 10000, 2400, 2500, 25000, "27t", 18, true));

        int upserted = 0;
        for (Map.Entry<String, BaseTruckSeed> e : seeds.entrySet()) {
            String vehicleType = e.getKey();
            BaseTruckSeed seed = e.getValue();
            List<String> targetCategories = seed.useExtendedCategory ? categories : List.of("카고");

            for (String categoryKr : targetCategories) {
                int lengthMm = seed.lengthMm;
                if ("TON_1".equals(vehicleType) && !"카고".equals(categoryKr)) {
                    lengthMm = 2800;
                }

                String vehicleBodyType = normalizeVehicleBodyType(categoryKr);
                String vehicleModel = resolveVehicleModel(vehicleType, seed.vehicleTypeKr, categoryKr, vehicleBodyType);
                String doorPosition = resolveDoorPosition(vehicleBodyType);
                BigDecimal tonnage = resolveTonnage(vehicleType, seed.maxWeightKg);
                BigDecimal lengthCm = mmToCm(lengthMm);
                BigDecimal widthCm = mmToCm(seed.widthMm);
                BigDecimal heightCm = mmToCm(seed.heightMm);
                BigDecimal maxVolume = calcVolumeCbm(lengthCm, widthCm, heightCm);

                upsertTruckSpecRow(
                        vehicleType,
                        seed.vehicleTypeKr,
                        categoryKr,
                        vehicleBodyType,
                        vehicleModel,
                        tonnage,
                        BigDecimal.valueOf(seed.maxWeightKg).setScale(2, RoundingMode.HALF_UP),
                        seed.maxWeightDisplay,
                        maxVolume,
                        lengthCm,
                        widthCm,
                        heightCm,
                        seed.palletCount,
                        "1100 x 1100",
                        doorPosition,
                        sourceName
                );
                upserted++;
            }
        }

        return upserted;
    }

    private void upsertTruckSpecRow(
            String vehicleType,
            String vehicleTypeKr,
            String categoryKr,
            String vehicleBodyType,
            String vehicleModel,
            BigDecimal tonnage,
            BigDecimal maxWeight,
            String maxWeightDisplay,
            BigDecimal maxVolume,
            BigDecimal lengthCm,
            BigDecimal widthCm,
            BigDecimal heightCm,
            Integer palletCount,
            String palletStandardMm,
            String doorPosition,
            String sourceName
    ) {
        TruckSpecCatalog entity = truckSpecCatalogRepository
                .findByVehicleTypeAndVehicleBodyType(vehicleType, vehicleBodyType)
                .orElseGet(() -> TruckSpecCatalog.create(vehicleType, vehicleBodyType));

        entity.applyStandardData(
                vehicleTypeKr,
                categoryKr,
                vehicleModel,
                tonnage,
                maxWeight,
                maxWeightDisplay,
                maxVolume,
                lengthCm,
                widthCm,
                heightCm,
                palletCount,
                palletStandardMm,
                doorPosition,
                sourceName
        );

        try {
            truckSpecCatalogRepository.saveAndFlush(entity);
        } catch (DataIntegrityViolationException ex) {
            // 레거시 uq_spec(tonnage+body+option_key) 충돌 시 톤수+바디 기준 기존 행을 갱신
            TruckSpecCatalog fallbackEntity = truckSpecCatalogRepository
                    .findByTonnageAndVehicleBodyType(tonnage, vehicleBodyType)
                    .orElse(entity);

            fallbackEntity.applyStandardData(
                    vehicleTypeKr,
                    categoryKr,
                    vehicleModel,
                    tonnage,
                    maxWeight,
                    maxWeightDisplay,
                    maxVolume,
                    lengthCm,
                    widthCm,
                    heightCm,
                    palletCount,
                    palletStandardMm,
                    doorPosition,
                    sourceName
            );
            truckSpecCatalogRepository.save(fallbackEntity);
            log.warn("truck_spec_catalog upsert fallback applied: vehicleType={}, bodyType={}, tonnage={}",
                    vehicleType, vehicleBodyType, tonnage);
        }
    }

    private JsonNode readJsonWithFallback(
            String overridePath,
            String classpathName,
            List<Path> localCandidates
    ) {
        List<Path> candidates = new ArrayList<>();
        if (overridePath != null && !overridePath.isBlank()) {
            candidates.add(Paths.get(overridePath));
        }
        candidates.addAll(localCandidates);

        for (Path path : candidates) {
            if (!Files.exists(path)) {
                continue;
            }
            try {
                String json = Files.readString(path);
                return objectMapper.readTree(json);
            } catch (Exception e) {
                log.warn("JSON 파싱 실패: {} ({})", path, e.getMessage());
            }
        }

        try (InputStream is = new ClassPathResource(classpathName).getInputStream()) {
            return objectMapper.readTree(is);
        } catch (IOException e) {
            return null;
        }
    }

    private String resolveSourceName(String overridePath, List<Path> localCandidates, String classpathName) {
        if (overridePath != null && !overridePath.isBlank()) {
            return overridePath;
        }
        for (Path candidate : localCandidates) {
            if (Files.exists(candidate)) {
                return candidate.toString();
            }
        }
        return classpathName;
    }

    private String text(JsonNode node, String field) {
        if (node == null || node.isMissingNode()) {
            return "";
        }
        JsonNode value = node.path(field);
        if (value.isMissingNode() || value.isNull()) {
            return "";
        }
        return value.asText("").trim();
    }

    private String normalizeVehicleBodyType(String categoryKr) {
        if (categoryKr == null || categoryKr.isBlank()) {
            return "CARGO";
        }
        String normalized = categoryKr.trim();
        if (normalized.contains("윙")) {
            return "WINGBODY";
        }
        if (normalized.contains("냉동") || normalized.contains("탑")) {
            return "TOP";
        }
        if (normalized.contains("리프트")) {
            return "LIFT";
        }
        if (normalized.contains("무진동")) {
            return "VIBRATION_FREE";
        }
        return "CARGO";
    }

    /**
     * DB truck_spec_catalog.vehicle_model 컬럼(일부 환경 NOT NULL) 채우기용 모델명 생성.
     */
    private String resolveVehicleModel(String vehicleType, String vehicleTypeKr, String categoryKr, String vehicleBodyType) {
        if (vehicleTypeKr != null && !vehicleTypeKr.isBlank()) {
            if (categoryKr != null && !categoryKr.isBlank()) {
                return vehicleTypeKr + " " + categoryKr;
            }
            return vehicleTypeKr;
        }
        if (vehicleType != null && !vehicleType.isBlank()) {
            if (vehicleBodyType != null && !vehicleBodyType.isBlank()) {
                return vehicleType + "_" + vehicleBodyType;
            }
            return vehicleType;
        }
        return "UNKNOWN_MODEL";
    }

    private String resolveDoorPosition(String vehicleBodyType) {
        if ("WINGBODY".equals(vehicleBodyType)) {
            return "side";
        }
        return "rear";
    }

    private BigDecimal resolveTonnage(String vehicleType, double maxWeightKg) {
        return switch (vehicleType) {
            case "DAMAS" -> new BigDecimal("0.4");
            case "LABO" -> new BigDecimal("0.5");
            case "TON_1" -> new BigDecimal("1.0");
            case "TON_1_4" -> new BigDecimal("1.4");
            case "TON_2_5" -> new BigDecimal("2.5");
            case "TON_3_5" -> new BigDecimal("3.5");
            case "TON_5", "TON_5_AXLE" -> new BigDecimal("5.0");
            case "TON_8" -> new BigDecimal("8.0");
            case "TON_11" -> new BigDecimal("11.0");
            case "TON_14" -> new BigDecimal("14.0");
            case "TON_15" -> new BigDecimal("15.0");
            case "TON_18" -> new BigDecimal("18.0");
            case "TON_25" -> new BigDecimal("25.0");
            default -> BigDecimal.valueOf(maxWeightKg / 1000.0).setScale(2, RoundingMode.HALF_UP);
        };
    }

    private BigDecimal mmToCm(int mm) {
        return BigDecimal.valueOf(mm)
                .divide(new BigDecimal("10"), 2, RoundingMode.HALF_UP);
    }

    private BigDecimal calcVolumeCbm(BigDecimal lengthCm, BigDecimal widthCm, BigDecimal heightCm) {
        if (lengthCm == null || widthCm == null || heightCm == null) {
            return BigDecimal.ZERO.setScale(3, RoundingMode.HALF_UP);
        }
        return lengthCm.multiply(widthCm).multiply(heightCm)
                .divide(new BigDecimal("1000000"), 3, RoundingMode.HALF_UP);
    }

    private record BaseTruckSeed(
            String vehicleTypeKr,
            int lengthMm,
            int widthMm,
            int heightMm,
            int maxWeightKg,
            String maxWeightDisplay,
            int palletCount,
            boolean useExtendedCategory
    ) {
    }
}
