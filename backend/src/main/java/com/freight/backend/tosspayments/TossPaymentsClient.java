package com.freight.backend.tosspayments;

import java.nio.charset.StandardCharsets;
import java.util.Base64;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

/**
 * 토스페이먼츠 API 클라이언트
 * - 결제 승인(confirm)만 사용. 준비는 프론트 결제창에서 orderId/amount/clientKey로 진행.
 * - 실제 결제 여부: API URL은 동일. 테스트 시크릿 키를 쓰면 실제 청구되지 않고, 라이브 키를 쓰면 실결제됨.
 */
@Component
public class TossPaymentsClient {

    private static final String CONFIRM_URL = "https://api.tosspayments.com/v1/payments/confirm";

    private final RestClient restClient;
    private final String secretKey;

    public TossPaymentsClient(
            RestClient.Builder restClientBuilder,
            @Value("${toss.payments.secret-key:}") String secretKey
    ) {
        this.secretKey = secretKey != null ? secretKey : "";
        this.restClient = restClientBuilder.build();
    }

    /** 결제창 성공 후 전달받은 paymentKey, orderId, amount로 토스 승인 API 호출 */
    public TossPaymentConfirmResponse confirm(String paymentKey, String orderId, long amount) {
        if (secretKey.isBlank()) {
            throw new IllegalStateException("toss.payments.secret-key is not set");
        }

        String auth = "Basic " + Base64.getEncoder()
                .encodeToString((secretKey + ":").getBytes(StandardCharsets.UTF_8));

        TossPaymentConfirmRequest body = new TossPaymentConfirmRequest(paymentKey, orderId, amount);

        return restClient.post()
                .uri(CONFIRM_URL)
                .header("Authorization", auth)
                .contentType(MediaType.APPLICATION_JSON)
                .body(body)
                .retrieve()
                .body(TossPaymentConfirmResponse.class);
    }

    /** secretKey 설정 여부 (prepare/confirm 사용 가능 여부 판단용) */
    public boolean isConfigured() {
        return secretKey != null && !secretKey.isBlank();
    }
}
