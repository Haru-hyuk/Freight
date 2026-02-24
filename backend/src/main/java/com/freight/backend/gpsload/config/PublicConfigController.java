package com.freight.backend.gpsmiss.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

/**
 * 프론트엔드에서 사용할 공개 설정 (application.yml 기준).
 * application.yml만 수정하면 전체 적용.
 */
@RestController
@RequestMapping("/api/config")
@CrossOrigin(origins = "*")
public class PublicConfigController {

    @Value("${kakao.javascript-appkey:}")
    private String kakaoJsAppKey;

    @GetMapping("/public")
    public Map<String, String> getPublicConfig() {
        return Map.of("kakaoJsAppKey", kakaoJsAppKey != null ? kakaoJsAppKey : "");
    }
}
