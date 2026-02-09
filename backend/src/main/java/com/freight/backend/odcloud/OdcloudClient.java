package com.freight.backend.odcloud;

import java.util.List;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

@Component
public class OdcloudClient {

    private final RestClient restClient;
    private final String apiKey;

    public OdcloudClient(
            RestClient.Builder restClientBuilder,
            @Value("${odcloud.api.base-url}") String baseUrl,
            @Value("${odcloud.api.key}") String apiKey
    ) {
        this.restClient = restClientBuilder.baseUrl(baseUrl).build();
        this.apiKey = apiKey;
    }

    public OdcloudValidateResponse validateBusiness(OdcloudValidateRequest.Business business) {
        OdcloudValidateRequest request = new OdcloudValidateRequest(List.of(business));
        return restClient.post()
                .uri(uriBuilder -> uriBuilder
                        .path("/api/nts-businessman/v1/validate")
                        .queryParam("serviceKey", apiKey)
                        .queryParam("returnType", "JSON")
                        .build())
                .contentType(MediaType.APPLICATION_JSON)
                .body(request)
                .retrieve()
                .body(OdcloudValidateResponse.class);
    }
}
