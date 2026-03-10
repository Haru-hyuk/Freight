package com.freight.backend.service;

import com.freight.backend.dto.notification.NotificationResponse;
import com.freight.backend.dto.notification.UnreadCountResponse;
import com.freight.backend.entity.Admin;
import com.freight.backend.entity.FcmToken;
import com.freight.backend.entity.Notification;
import com.freight.backend.exception.CustomException;
import com.freight.backend.exception.ErrorCode;
import com.freight.backend.repository.AdminRepository;
import com.freight.backend.repository.NotificationRepository;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.CompletableFuture;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

@Service
@RequiredArgsConstructor
public class NotificationService {
    private static final Logger log = LoggerFactory.getLogger(NotificationService.class);

    private final NotificationRepository notificationRepository;
    private final AdminRepository adminRepository;
    private final FcmService fcmService;

    @Transactional
    public void createNotification(FcmToken.UserType receiverType, Long receiverId, Long matchId, Notification.Type type, String message) {
        Notification.Type normalizedType = normalizeType(type, message);
        Notification notification = Notification.builder()
                .receiverType(receiverType)
                .receiverId(receiverId)
                .matchId(matchId)
                .type(normalizedType)
                .message(message)
                .build();
        Notification saved = notificationRepository.save(notification);

        sendToUserAsyncAfterCommit(
                receiverType,
                receiverId,
                "Freight Notification",
                message,
                Map.of(
                        "notificationId", String.valueOf(saved.getId()),
                        "type", normalizedType == null ? "" : normalizedType.name(),
                        "matchId", matchId == null ? "" : String.valueOf(matchId)
                )
        );

        mirrorToAdminsAsyncAfterCommit(receiverType, saved, normalizedType, message);
    }

    /** 관리자 전용 알림 (정산 이상, 시스템 경고 등) */
    @Transactional
    public void notifyAllAdmins(Long matchId, Notification.Type type, String message) {
        List<Admin> admins = adminRepository.findAll();
        if (admins.isEmpty()) {
            return;
        }

        List<Notification> adminNotifications = new ArrayList<>();
        for (Admin admin : admins) {
            if (admin == null || admin.getAdminId() == null) {
                continue;
            }
            adminNotifications.add(Notification.builder()
                    .receiverType(FcmToken.UserType.ADMIN)
                    .receiverId(admin.getAdminId())
                    .matchId(matchId)
                    .type(type)
                    .message(message)
                    .build());
        }

        if (adminNotifications.isEmpty()) {
            return;
        }

        List<Notification> savedNotifications = notificationRepository.saveAll(adminNotifications);
        for (Notification adminNotification : savedNotifications) {
            sendToUserAsyncAfterCommit(
                    FcmToken.UserType.ADMIN,
                    adminNotification.getReceiverId(),
                    "[긴급] 운영 알림",
                    message,
                    Map.of(
                            "notificationId", String.valueOf(adminNotification.getId()),
                            "type", type == null ? "" : type.name(),
                            "matchId", matchId == null ? "" : String.valueOf(matchId),
                            "priority", "high"
                    )
            );
        }
    }

    @Transactional(readOnly = true)
    public List<NotificationResponse> getMyNotifications(FcmToken.UserType receiverType, Long receiverId) {
        return notificationRepository.findByReceiverTypeAndReceiverIdOrderByCreatedAtDesc(receiverType, receiverId)
                .stream()
                .map(NotificationResponse::from)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public UnreadCountResponse getUnreadCount(FcmToken.UserType receiverType, Long receiverId) {
        long count = notificationRepository.countByReceiverTypeAndReceiverIdAndIsReadFalse(receiverType, receiverId);
        return UnreadCountResponse.of(count);
    }

    @Transactional
    public void markRead(FcmToken.UserType receiverType, Long receiverId, Long notificationId) {
        Notification notification = notificationRepository.findById(notificationId)
                .orElseThrow(() -> new CustomException(ErrorCode.INVALID_REQUEST));
        if (!notification.getReceiverId().equals(receiverId) || notification.getReceiverType() != receiverType) {
            throw new CustomException(ErrorCode.AUTH_FORBIDDEN);
        }
        notification.markRead();
        notificationRepository.save(notification);
    }

    private Notification.Type normalizeType(Notification.Type type, String message) {
        if (type == null) {
            return Notification.Type.SYSTEM;
        }

        if (type == Notification.Type.MATCH_ACCEPTED) {
            return Notification.Type.DRIVER_ASSIGNED;
        }

        if (type != Notification.Type.MATCH_UPDATED) {
            return type;
        }

        String text = message == null ? "" : message.trim().toUpperCase();
        if (text.isEmpty()) {
            return Notification.Type.MATCH_UPDATED;
        }

        if (text.contains("결제") && text.contains("완료")) {
            return Notification.Type.PAYMENT_COMPLETED;
        }
        if (text.contains("결제") && (text.contains("실패") || text.contains("거절"))) {
            return Notification.Type.PAYMENT_FAILED;
        }
        if ((text.contains("운송") && text.contains("시작")) || text.contains("상차")) {
            return Notification.Type.DELIVERY_STARTED;
        }
        if ((text.contains("운송") && text.contains("완료")) || text.contains("하차")) {
            return Notification.Type.DELIVERY_COMPLETED;
        }
        if (text.contains("정산") && (text.contains("완료") || text.contains("확정"))) {
            return Notification.Type.SETTLEMENT_COMPLETED;
        }

        return Notification.Type.MATCH_UPDATED;
    }

    private void mirrorToAdmins(
            FcmToken.UserType receiverType,
            Notification sourceNotification,
            Notification.Type normalizedType,
            String message
    ) {
        if (receiverType == FcmToken.UserType.ADMIN || sourceNotification == null) {
            return;
        }

        List<Admin> admins = adminRepository.findAll();
        if (admins.isEmpty()) {
            return;
        }

        List<Notification> adminNotifications = new ArrayList<>();
        for (Admin admin : admins) {
            if (admin == null || admin.getAdminId() == null) {
                continue;
            }

            adminNotifications.add(Notification.builder()
                    .receiverType(FcmToken.UserType.ADMIN)
                    .receiverId(admin.getAdminId())
                    .matchId(sourceNotification.getMatchId())
                    .type(normalizedType)
                    .message(message)
                    .build());
        }

        if (adminNotifications.isEmpty()) {
            return;
        }

        List<Notification> savedAdminNotifications = notificationRepository.saveAll(adminNotifications);
        for (Notification adminNotification : savedAdminNotifications) {
            sendToUserAsyncAfterCommit(
                    FcmToken.UserType.ADMIN,
                    adminNotification.getReceiverId(),
                    "Freight Notification",
                    message,
                    Map.of(
                            "notificationId", String.valueOf(adminNotification.getId()),
                            "type", normalizedType == null ? "" : normalizedType.name(),
                            "matchId", adminNotification.getMatchId() == null ? "" : String.valueOf(adminNotification.getMatchId())
                    )
            );
        }
    }

    private void mirrorToAdminsAsyncAfterCommit(
            FcmToken.UserType receiverType,
            Notification sourceNotification,
            Notification.Type normalizedType,
            String message
    ) {
        Runnable dispatch = () -> CompletableFuture.runAsync(
                () -> safeMirrorToAdmins(receiverType, sourceNotification, normalizedType, message)
        );
        if (TransactionSynchronizationManager.isSynchronizationActive()) {
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override
                public void afterCommit() {
                    dispatch.run();
                }
            });
            return;
        }
        dispatch.run();
    }

    private void safeMirrorToAdmins(
            FcmToken.UserType receiverType,
            Notification sourceNotification,
            Notification.Type normalizedType,
            String message
    ) {
        try {
            mirrorToAdmins(receiverType, sourceNotification, normalizedType, message);
        } catch (Exception e) {
            log.warn(
                    "Admin notification mirror failed. receiverType={}, matchId={}, cause={}",
                    receiverType,
                    sourceNotification == null ? null : sourceNotification.getMatchId(),
                    e.getMessage()
            );
        }
    }

    private void sendToUserAsyncAfterCommit(
            FcmToken.UserType userType,
            Long userId,
            String title,
            String body,
            Map<String, String> data
    ) {
        Runnable dispatch = () -> CompletableFuture.runAsync(
                () -> safeSendToUser(userType, userId, title, body, data)
        );
        if (TransactionSynchronizationManager.isSynchronizationActive()) {
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override
                public void afterCommit() {
                    dispatch.run();
                }
            });
            return;
        }
        dispatch.run();
    }

    private void safeSendToUser(
            FcmToken.UserType userType,
            Long userId,
            String title,
            String body,
            Map<String, String> data
    ) {
        try {
            fcmService.sendToUser(userType, userId, title, body, data);
        } catch (Exception e) {
            log.warn("FCM async dispatch failed. userType={}, userId={}, cause={}", userType, userId, e.getMessage());
        }
    }
}
