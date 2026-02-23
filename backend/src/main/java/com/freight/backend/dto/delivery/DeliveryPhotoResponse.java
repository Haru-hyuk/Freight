package com.freight.backend.dto.delivery;

import com.freight.backend.entity.DeliveryPhoto;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
@AllArgsConstructor
public class DeliveryPhotoResponse {
    private Long photoId;
    private Long matchId;
    private Long driverId;
    private String type;
    private String fileUrl;
    private LocalDateTime takenAt;
    private BigDecimal lat;
    private BigDecimal lng;
    private Long fileSize;
    private String mimeType;
    private LocalDateTime createdAt;

    public static DeliveryPhotoResponse from(DeliveryPhoto photo) {
        return DeliveryPhotoResponse.builder()
                .photoId(photo.getPhotoId())
                .matchId(photo.getMatchId())
                .driverId(photo.getDriverId())
                .type(photo.getType().name())
                .fileUrl(photo.getFileUrl())
                .takenAt(photo.getTakenAt())
                .lat(photo.getLat())
                .lng(photo.getLng())
                .fileSize(photo.getFileSize())
                .mimeType(photo.getMimeType())
                .createdAt(photo.getCreatedAt())
                .build();
    }
}

