package com.freight.backend.gpsload.route.api;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.freight.backend.geocoding.GeocodingResult;
import com.freight.backend.geocoding.GeocodingService;
import com.freight.backend.gpsload.route.client.KakaoPlaceClient;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.http.ResponseEntity;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/route")
public class PlaceController {

    private final KakaoPlaceClient kakaoPlaceClient;
    private final GeocodingService geocodingService;
    private final ObjectMapper objectMapper = new ObjectMapper();

    public PlaceController(KakaoPlaceClient kakaoPlaceClient, GeocodingService geocodingService) {
        this.kakaoPlaceClient = kakaoPlaceClient;
        this.geocodingService = geocodingService;
    }

    @GetMapping(value = "/place-search", produces = MediaType.APPLICATION_JSON_VALUE)
    @PreAuthorize("hasAnyRole('DRIVER','SHIPPER','ADMIN','SUPER','OPERATOR','CS')")
    public ResponseEntity<String> search(@RequestParam("query") String query) {
        JsonNode payload = kakaoPlaceClient.search(query);
        if (hasDocuments(payload)) {
            return ResponseEntity.ok(payload.toString());
        }

        // Last-resort fallback from backend geocoding service.
        try {
            GeocodingResult fallback = geocodingService.geocode(query);
            ObjectNode root = objectMapper.createObjectNode();
            root.put("status", "FALLBACK_OK");
            ArrayNode docs = objectMapper.createArrayNode();
            ObjectNode doc = objectMapper.createObjectNode();
            doc.put("x", String.valueOf(fallback.lng()));
            doc.put("y", String.valueOf(fallback.lat()));
            doc.put("address_name", fallback.normalizedAddress());
            doc.put("place_name", fallback.normalizedAddress());
            docs.add(doc);
            root.set("documents", docs);
            return ResponseEntity.ok(root.toString());
        } catch (RuntimeException ignored) {
            // Keep original empty payload when fallback also fails.
        }

        return ResponseEntity.ok(payload.toString());
    }

    private boolean hasDocuments(JsonNode payload) {
        return payload != null && payload.path("documents").isArray() && !payload.path("documents").isEmpty();
    }
}
