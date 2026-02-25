package com.freight.backend.gpsload.route.api;

import com.freight.backend.gpsload.route.model.RouteRequest;
import com.freight.backend.gpsload.route.model.RouteResponse;
import com.freight.backend.gpsload.route.service.KakaoRouteService;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/route")
public class RouteController {

    private final KakaoRouteService kakaoRouteService;

    public RouteController(KakaoRouteService kakaoRouteService) {
        this.kakaoRouteService = kakaoRouteService;
    }

    @PostMapping(value = "/find", consumes = MediaType.APPLICATION_JSON_VALUE, produces = MediaType.APPLICATION_JSON_VALUE)
    public RouteResponse find(@RequestBody RouteRequest request) {
        return kakaoRouteService.findRoute(request);
    }
}
