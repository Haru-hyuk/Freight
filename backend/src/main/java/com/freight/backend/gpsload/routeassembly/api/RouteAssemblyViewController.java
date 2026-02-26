package com.freight.backend.gpsload.routeassembly.api;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;

/**
 * 노선 조립 테스트 페이지 (카카오 지도 키 서버 주입)
 */
@Controller
public class RouteAssemblyViewController {

    @Value("${kakao.javascript-appkey:}")
    private String kakaoJsAppKey;

    @GetMapping("/route-assembly-test-view")
    public String page(Model model) {
        model.addAttribute("kakaoJsAppKey", kakaoJsAppKey != null ? kakaoJsAppKey : "");
        return "route-assembly-test";
    }
}
