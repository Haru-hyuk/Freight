package com.freight.backend.config;

import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.client.ClientHttpRequestFactory;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestTemplate;

@Configuration
public class RestClientConfig {

    @Value("${external.http.connect-timeout-ms:3000}")
    private int connectTimeoutMs;

    @Value("${external.http.read-timeout-ms:5000}")
    private int readTimeoutMs;

    @Bean("externalApiRequestFactory")
    public ClientHttpRequestFactory externalApiRequestFactory() {
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(Math.max(500, connectTimeoutMs));
        factory.setReadTimeout(Math.max(500, readTimeoutMs));
        return factory;
    }

    @Bean
    public RestClient.Builder restClientBuilder(
            @Qualifier("externalApiRequestFactory") ClientHttpRequestFactory requestFactory
    ) {
        return RestClient.builder().requestFactory(requestFactory);
    }

    @Bean("externalApiRestTemplate")
    public RestTemplate externalApiRestTemplate(
            @Qualifier("externalApiRequestFactory") ClientHttpRequestFactory requestFactory
    ) {
        return new RestTemplate(requestFactory);
    }
}
