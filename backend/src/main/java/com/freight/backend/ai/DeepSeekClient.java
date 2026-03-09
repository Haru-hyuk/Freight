package com.freight.backend.ai;

import com.fasterxml.jackson.annotation.JsonProperty;
import java.util.List;
import java.util.Optional;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.atomic.AtomicLong;
import lombok.Getter;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;

@Service
public class DeepSeekClient {
    private static final Logger log = LoggerFactory.getLogger(DeepSeekClient.class);
    private static final int MAX_CONSECUTIVE_FAILURES_BEFORE_COOLDOWN = 2;
    private static final long COOLDOWN_MS = 5 * 60 * 1000L;

    @Value("${deepseek.enabled:false}")
    private boolean enabled;

    @Value("${deepseek.api.key:}")
    private String apiKey;

    @Value("${deepseek.api.base-url:https://api.deepseek.com}")
    private String baseUrl;

    @Value("${deepseek.api.model:deepseek-chat}")
    private String model;

    private final RestTemplate restTemplate;
    private final AtomicInteger consecutiveFailures = new AtomicInteger(0);
    private final AtomicLong cooldownUntil = new AtomicLong(0);

    public DeepSeekClient(@Qualifier("externalApiRestTemplate") RestTemplate restTemplate) {
        this.restTemplate = restTemplate;
    }

    public Optional<String> generateAdvice(String prompt) {
        String systemPrompt =
                "You are an expert freight dispatch analyst. " +
                "Return concise Korean advice for shippers. " +
                "Output plain text only, no markdown, no bullets, no emojis. " +
                "Keep it to 1-2 sentences with practical wording. " +
                "Focus on dispatch speed likelihood, load safety, and price fitness.";
        return generateText(systemPrompt, prompt, 0.2, 200);
    }

    public Optional<String> generateText(String systemPrompt, String userPrompt, double temperature, int maxTokens) {
        if (!enabled || apiKey == null || apiKey.isBlank()) {
            return Optional.empty();
        }
        if (System.currentTimeMillis() < cooldownUntil.get()) {
            return Optional.empty();
        }

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.setBearerAuth(apiKey);

        ChatCompletionRequest body = new ChatCompletionRequest(
                model,
                List.of(
                        new Message("system", systemPrompt == null ? "" : systemPrompt),
                        new Message("user", userPrompt == null ? "" : userPrompt)
                ),
                temperature,
                maxTokens
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
            consecutiveFailures.set(0);
            cooldownUntil.set(0);
            return content.isEmpty() ? Optional.empty() : Optional.of(content);
        } catch (RestClientException e) {
            int failures = consecutiveFailures.incrementAndGet();
            if (failures >= MAX_CONSECUTIVE_FAILURES_BEFORE_COOLDOWN) {
                long until = System.currentTimeMillis() + COOLDOWN_MS;
                cooldownUntil.set(until);
                log.warn("DeepSeek API call failed: {}. cooldownUntil={}", e.getMessage(), until);
            } else {
                log.warn("DeepSeek API call failed: {}", e.getMessage());
            }
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

        public ChatCompletionRequest(String model, List<Message> messages, Double temperature, Integer maxTokens) {
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
