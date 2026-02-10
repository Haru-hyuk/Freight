package com.freight.backend.pricing;

import tools.jackson.databind.ObjectMapper;
import java.io.InputStream;
import java.util.Map;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Component;

@Component
public class PricingRateTable {

    private final Map<String, Map<String, Integer>> rates;

    public PricingRateTable(ObjectMapper objectMapper) {
        this.rates = loadRates(objectMapper);
    }

    public Integer getRate(int distanceKm, PricingVehicleType vehicleType) {
        String rangeKey = DistanceRangeResolver.resolveKey(distanceKm);
        if (rangeKey == null || vehicleType == null) {
            return null;
        }
        Map<String, Integer> rangeRates = rates.get(rangeKey);
        if (rangeRates == null) {
            return null;
        }
        return rangeRates.get(vehicleType.name());
    }

    @SuppressWarnings("unchecked")
    private Map<String, Map<String, Integer>> loadRates(ObjectMapper objectMapper) {
        try (InputStream is = new ClassPathResource("pricing_rate_table.json").getInputStream()) {
            Map<String, Object> root = objectMapper.readValue(is, Map.class);
            Object ranges = root.get("ranges");
            return (Map<String, Map<String, Integer>>) ranges;
        } catch (Exception e) {
            throw new IllegalStateException("Failed to load pricing_rate_table.json", e);
        }
    }
}
