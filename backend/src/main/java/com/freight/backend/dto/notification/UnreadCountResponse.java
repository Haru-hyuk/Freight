package com.freight.backend.dto.notification;

import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class UnreadCountResponse {
    private long unreadCount;

    public static UnreadCountResponse of(long unreadCount) {
        return UnreadCountResponse.builder()
                .unreadCount(unreadCount)
                .build();
    }
}
