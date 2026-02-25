package com.freight.backend.gpsload.route.api;

import com.fasterxml.jackson.databind.JsonNode;
import com.freight.backend.gpsload.route.client.KakaoPlaceClient;
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

    public PlaceController(KakaoPlaceClient kakaoPlaceClient) {
        this.kakaoPlaceClient = kakaoPlaceClient;
    }

    @GetMapping(value = "/place-search", produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<String> search(@RequestParam("query") String query) {
        JsonNode payload = kakaoPlaceClient.searchKeyword(query);
        return ResponseEntity.ok(payload.toString());
    }
}
