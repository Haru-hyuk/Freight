package com.freight.backend.ai;

import com.fasterxml.jackson.annotation.JsonProperty;
import java.util.List;
import java.util.Optional;
import lombok.Getter;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;

@Service
@RequiredArgsConstructor
public class DeepSeekClient {
    private static final Logger log = LoggerFactory.getLogger(DeepSeekClient.class);

    @Value("${deepseek.enabled:false}")
    private boolean enabled;

    @Value("${deepseek.api.key:}")
    private String apiKey;

    @Value("${deepseek.api.base-url:https://api.deepseek.com}")
    private String baseUrl;

    @Value("${deepseek.api.model:deepseek-chat}")
    private String model;

    private final RestTemplate restTemplate = new RestTemplate();

    public Optional<String> generateAdvice(String prompt) {
        if (!enabled || apiKey == null || apiKey.isBlank()) {
            return Optional.empty();
        }

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.setBearerAuth(apiKey);

        ChatCompletionRequest body = new ChatCompletionRequest(
                model,
                List.of(
                        new Message("system", "당신은 화물 운송 견적 검증을 돕는 조언가입니다."),
                        new Message("user", prompt)
                ),
                0.2,
                200
        );

        try {
            String url = baseUrl + "/chat/completions";
            ChatCompletionResponse response = restTemplate.postForObject(
                    url,
                    new HttpEntity<>(body, headers),
                    ChatCompletionResponse.class
            );
            if (response == null || response.getChoices() == null || response.getChoices().isEmpty()) {
                return Optional.empty();
            }
            Message message = response.getChoices().get(0).getMessage();
            if (message == null || message.getContent() == null) {
                return Optional.empty();
            }
            String content = message.getContent().trim();
            return content.isEmpty() ? Optional.empty() : Optional.of(content);
        } catch (RestClientException e) {
            log.warn("DeepSeek API call failed: {}", e.getMessage());
            return Optional.empty();
        }
    }

    @Getter
    public static class ChatCompletionRequest {
        private final String model;
        private final List<Message> messages;
        private final Double temperature;
        @JsonProperty("max_tokens")
        private final Integer maxTokens;

        public ChatCompletionRequest(
                String model,
                List<Message> messages,
                Double temperature,
                Integer maxTokens
        ) {
            this.model = model;
            this.messages = messages;
            this.temperature = temperature;
            this.maxTokens = maxTokens;
        }
    }

    @Getter
    public static class Message {
        private String role;
        private String content;

        public Message() {
        }

        public Message(String role, String content) {
            this.role = role;
            this.content = content;
        }
    }

    @Getter
    public static class ChatCompletionResponse {
        private List<Choice> choices;
    }

    @Getter
    public static class Choice {
        private Message message;

        public Choice() {
        }
    }
}
