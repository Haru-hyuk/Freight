package com.freight.backend.service;

import com.freight.backend.dto.notification.NotificationResponse;
import com.freight.backend.dto.notification.UnreadCountResponse;
import com.freight.backend.entity.FcmToken;
import com.freight.backend.entity.Notification;
import com.freight.backend.exception.CustomException;
import com.freight.backend.exception.ErrorCode;
import com.freight.backend.repository.NotificationRepository;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class NotificationService {

    private final NotificationRepository notificationRepository;
    private final FcmService fcmService;

    @Transactional
    public void createNotification(FcmToken.UserType receiverType, Long receiverId, Long matchId, Notification.Type type, String message) {
        Notification notification = Notification.builder()
                .receiverId(receiverId)
                .matchId(matchId)
                .type(type)
                .message(message)
                .build();
        Notification saved = notificationRepository.save(notification);

        fcmService.sendToUser(
                receiverType,
                receiverId,
                "Freight Notification",
                message,
                Map.of(
                        "notificationId", String.valueOf(saved.getId()),
                        "type", type == null ? "" : type.name(),
                        "matchId", matchId == null ? "" : String.valueOf(matchId)
                )
        );
    }

    @Transactional(readOnly = true)
    public List<NotificationResponse> getMyNotifications(Long receiverId) {
        return notificationRepository.findByReceiverIdOrderByCreatedAtDesc(receiverId)
                .stream()
                .map(NotificationResponse::from)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public UnreadCountResponse getUnreadCount(Long receiverId) {
        long count = notificationRepository.countByReceiverIdAndIsReadFalse(receiverId);
        return UnreadCountResponse.of(count);
    }

    @Transactional
    public void markRead(Long receiverId, Long notificationId) {
        Notification notification = notificationRepository.findById(notificationId)
                .orElseThrow(() -> new CustomException(ErrorCode.INVALID_REQUEST));
        if (!notification.getReceiverId().equals(receiverId)) {
            throw new CustomException(ErrorCode.AUTH_FORBIDDEN);
        }
        notification.markRead();
        notificationRepository.save(notification);
    }
}
