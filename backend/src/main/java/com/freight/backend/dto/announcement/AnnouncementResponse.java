package com.freight.backend.dto.announcement;

import com.freight.backend.entity.Announcement;
import java.time.LocalDateTime;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class AnnouncementResponse {
    private Long announcementId;
    private Long adminId;
    private String title;
    private String content;
    private Boolean isPinned;
    private LocalDateTime publishedAt;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public static AnnouncementResponse from(Announcement announcement) {
        return AnnouncementResponse.builder()
                .announcementId(announcement.getAnnouncementId())
                .adminId(announcement.getAdminId())
                .title(announcement.getTitle())
                .content(announcement.getContent())
                .isPinned(announcement.getIsPinned())
                .publishedAt(announcement.getPublishedAt())
                .createdAt(announcement.getCreatedAt())
                .updatedAt(announcement.getUpdatedAt())
                .build();
    }
}
