package com.freight.backend.service;

import com.freight.backend.entity.FcmToken;
import com.freight.backend.exception.CustomException;
import com.freight.backend.exception.ErrorCode;
import com.freight.backend.repository.FcmTokenRepository;
import com.google.firebase.messaging.FirebaseMessaging;
import com.google.firebase.messaging.FirebaseMessagingException;
import com.google.firebase.messaging.Message;
import com.google.firebase.messaging.MessagingErrorCode;
import com.google.firebase.messaging.Notification;
import java.util.List;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Slf4j
public class FcmService {

    private final FcmTokenRepository fcmTokenRepository;
    private final ObjectProvider<FirebaseMessaging> firebaseMessagingProvider;

    @Value("${fcm.enabled:true}")
    private boolean enabled;
    private volatile boolean missingMessagingClientLogged;

    @Transactional
    public void upsertToken(FcmToken.UserType userType, Long userId, FcmToken.DeviceType deviceType, String rawToken) {
        String tokenValue = normalizeToken(rawToken);

        FcmToken fcmToken = fcmTokenRepository.findByFcmToken(tokenValue)
                .orElseGet(() -> FcmToken.builder()
                        .userType(userType)
                        .userId(userId)
                        .deviceType(deviceType)
                        .fcmToken(tokenValue)
                        .build());

        fcmToken.activate(userType, userId, deviceType);
        fcmTokenRepository.save(fcmToken);
    }

    @Transactional
    public void deactivateToken(FcmToken.UserType userType, Long userId, String rawToken) {
        String tokenValue = normalizeToken(rawToken);

        FcmToken fcmToken = fcmTokenRepository.findByFcmToken(tokenValue)
                .orElseThrow(() -> new CustomException(ErrorCode.INVALID_REQUEST));

        if (!fcmToken.getUserId().equals(userId) || fcmToken.getUserType() != userType) {
            throw new CustomException(ErrorCode.AUTH_FORBIDDEN);
        }

        fcmToken.deactivate();
        fcmTokenRepository.save(fcmToken);
    }

    @Transactional
    public void sendToUser(FcmToken.UserType userType, Long userId, String title, String body, Map<String, String> data) {
        if (!enabled) {
            return;
        }
        FirebaseMessaging firebaseMessaging = firebaseMessagingProvider.getIfAvailable();
        if (firebaseMessaging == null) {
            if (!missingMessagingClientLogged) {
                missingMessagingClientLogged = true;
                log.warn("FCM is enabled but FirebaseMessaging client is unavailable. Check fcm.service-account-path.");
            }
            return;
        }

        List<FcmToken> tokens = fcmTokenRepository.findByUserTypeAndUserIdAndIsActiveTrue(userType, userId);
        for (FcmToken token : tokens) {
            sendToToken(firebaseMessaging, token, title, body, data);
        }
    }

    private static final int MAX_RETRY_ATTEMPTS = 3;
    private static final long RETRY_DELAY_MS = 500;

    private void sendToToken(FirebaseMessaging firebaseMessaging, FcmToken token, String title, String body, Map<String, String> data) {
        Message.Builder builder = Message.builder()
                .setToken(token.getFcmToken())
                .setNotification(Notification.builder()
                        .setTitle(title)
                        .setBody(body)
                        .build());

        if (data != null && !data.isEmpty()) {
            builder.putAllData(data);
        }

        Message message = builder.build();
        int attempt = 0;
        Exception lastException = null;

        while (attempt < MAX_RETRY_ATTEMPTS) {
            attempt++;
            try {
                firebaseMessaging.send(message);
                return; // 성공 시 즉시 반환
            } catch (FirebaseMessagingException e) {
                lastException = e;
                MessagingErrorCode errorCode = e.getMessagingErrorCode();

                // 영구 실패: 재시도 불필요
                if (MessagingErrorCode.UNREGISTERED == errorCode
                        || MessagingErrorCode.INVALID_ARGUMENT == errorCode) {
                    token.deactivate();
                    fcmTokenRepository.save(token);
                    log.warn("[FCM] 토큰 비활성화 (영구 실패). userId={}, tokenId={}, reason={}",
                            token.getUserId(), token.getId(), errorCode);
                    return;
                }

                // 일시적 실패: 재시도 가능
                if (isRetryable(errorCode) && attempt < MAX_RETRY_ATTEMPTS) {
                    log.info("[FCM] 재시도 예정. userId={}, tokenId={}, attempt={}/{}, reason={}",
                            token.getUserId(), token.getId(), attempt, MAX_RETRY_ATTEMPTS, errorCode);
                    sleep(RETRY_DELAY_MS * attempt); // exponential backoff
                    continue;
                }

                log.warn("[FCM] 전송 실패 (재시도 불가). userId={}, tokenId={}, attempt={}/{}, reason={}",
                        token.getUserId(), token.getId(), attempt, MAX_RETRY_ATTEMPTS, errorCode);
                return;
            } catch (Exception e) {
                lastException = e;
                if (attempt < MAX_RETRY_ATTEMPTS) {
                    log.info("[FCM] 재시도 예정 (일반 오류). userId={}, tokenId={}, attempt={}/{}",
                            token.getUserId(), token.getId(), attempt, MAX_RETRY_ATTEMPTS);
                    sleep(RETRY_DELAY_MS * attempt);
                    continue;
                }
            }
        }

        log.error("[FCM] 최종 전송 실패. userId={}, tokenId={}, attempts={}",
                token.getUserId(), token.getId(), attempt, lastException);
    }

    private boolean isRetryable(MessagingErrorCode errorCode) {
        return errorCode == MessagingErrorCode.UNAVAILABLE
                || errorCode == MessagingErrorCode.INTERNAL
                || errorCode == MessagingErrorCode.QUOTA_EXCEEDED;
    }

    private void sleep(long millis) {
        try {
            Thread.sleep(millis);
        } catch (InterruptedException ie) {
            Thread.currentThread().interrupt();
        }
    }

    private String normalizeToken(String rawToken) {
        if (rawToken == null || rawToken.trim().isEmpty()) {
            throw new CustomException(ErrorCode.INVALID_INPUT_VALUE);
        }
        return rawToken.trim();
    }
}
