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

    @Value("${fcm.enabled:false}")
    private boolean enabled;

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
        FirebaseMessaging firebaseMessaging = firebaseMessagingProvider.getIfAvailable();
        if (!enabled || firebaseMessaging == null) {
            return;
        }

        List<FcmToken> tokens = fcmTokenRepository.findByUserTypeAndUserIdAndIsActiveTrue(userType, userId);
        for (FcmToken token : tokens) {
            sendToToken(firebaseMessaging, token, title, body, data);
        }
    }

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

        try {
            firebaseMessaging.send(builder.build());
        } catch (FirebaseMessagingException e) {
            MessagingErrorCode errorCode = e.getMessagingErrorCode();
            if (MessagingErrorCode.UNREGISTERED == errorCode
                    || MessagingErrorCode.INVALID_ARGUMENT == errorCode) {
                token.deactivate();
                fcmTokenRepository.save(token);
            }
            log.warn("Failed to send FCM message. userId={}, tokenId={}, reason={}",
                    token.getUserId(), token.getId(), errorCode);
        } catch (Exception e) {
            log.warn("Failed to send FCM message. userId={}, tokenId={}",
                    token.getUserId(), token.getId(), e);
        }
    }

    private String normalizeToken(String rawToken) {
        if (rawToken == null || rawToken.trim().isEmpty()) {
            throw new CustomException(ErrorCode.INVALID_INPUT_VALUE);
        }
        return rawToken.trim();
    }
}
