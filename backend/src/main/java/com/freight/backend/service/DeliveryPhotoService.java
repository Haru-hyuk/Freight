package com.freight.backend.service;

import com.freight.backend.dto.delivery.DeliveryPhotoResponse;
import com.freight.backend.entity.DeliveryPhoto;
import com.freight.backend.entity.FcmToken;
import com.freight.backend.entity.Match;
import com.freight.backend.entity.Notification;
import com.freight.backend.entity.Payment;
import com.freight.backend.entity.Quote;
import com.freight.backend.exception.CustomException;
import com.freight.backend.exception.ErrorCode;
import com.freight.backend.repository.DeliveryPhotoRepository;
import com.freight.backend.repository.MatchRepository;
import com.freight.backend.repository.PaymentRepository;
import com.freight.backend.repository.QuoteRepository;
import java.io.IOException;
import java.math.BigDecimal;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

/**
 * 배송 사진 서비스
 * - 상하차 사진 업로드/조회
 * - 운송 상태 자동 전환 트리거
 */
@Service
@RequiredArgsConstructor
public class DeliveryPhotoService {
    private static final Set<String> ALLOWED_IMAGE_CONTENT_TYPES = Set.of(
            "image/jpeg",
            "image/jpg",
            "image/png",
            "image/webp",
            "image/heic",
            "image/heif"
    );

    private final DeliveryPhotoRepository deliveryPhotoRepository;
    private final MatchRepository matchRepository;
    private final QuoteRepository quoteRepository;
    private final PaymentRepository paymentRepository;
    private final NotificationService notificationService;

    @Value("${delivery-photo.storage-dir:uploads/delivery-photos}")
    private String storageDir;

    /** 상하차 사진 업로드 (PICKUP: 운송시작 트리거, DELIVERY: 증빙만 저장) */
    @Transactional
    public DeliveryPhotoResponse uploadByDriver(
            Long driverId,
            Long matchId,
            DeliveryPhoto.Type type,
            MultipartFile file,
            LocalDateTime takenAt,
            BigDecimal lat,
            BigDecimal lng,
            Integer stopOrder,
            String stopLabel
    ) {
        if (type == null || file == null || file.isEmpty()) {
            throw new CustomException(ErrorCode.INVALID_REQUEST);
        }
        if (stopOrder != null && stopOrder < 1) {
            throw new CustomException(ErrorCode.INVALID_REQUEST);
        }
        String mimeType = file.getContentType();
        if (!isAllowedImageMimeType(mimeType)) {
            throw new CustomException(ErrorCode.INVALID_REQUEST);
        }

        Match match = matchRepository.findById(matchId)
                .orElseThrow(() -> new CustomException(ErrorCode.MATCH_NOT_FOUND));
        if (match.getDriverId() == null || !match.getDriverId().equals(driverId)) {
            throw new CustomException(ErrorCode.AUTH_FORBIDDEN);
        }
        Quote quote = quoteRepository.findById(match.getQuoteId())
                .orElseThrow(() -> new CustomException(ErrorCode.INVALID_REQUEST));

        validateByStatus(match.getStatus(), type);

        String ext = resolveExtension(file.getOriginalFilename(), mimeType);
        String key = buildStorageKey(matchId, type, ext);
        storeFile(file, key);

        DeliveryPhoto photo = DeliveryPhoto.builder()
                .matchId(matchId)
                .driverId(driverId)
                .type(type)
                .fileUrl("PENDING")
                .storageKey(key)
                .takenAt(takenAt)
                .lat(lat)
                .lng(lng)
                .fileSize(file.getSize())
                .mimeType(mimeType)
                .stopOrder(stopOrder)
                .stopLabel(normalizeStopLabel(stopLabel))
                .build();
        DeliveryPhoto saved = deliveryPhotoRepository.save(photo);
        saved.updateFileUrl("/api/delivery-photos/" + saved.getPhotoId() + "/file");

        Match.Status before = match.getStatus();
        updateMatchStatusOnUpload(match, type);
        Match persistedMatch = matchRepository.save(match);
        syncQuoteAndNotifyByStatusChange(before, persistedMatch.getStatus(), quote, persistedMatch.getMatchId());

        return DeliveryPhotoResponse.from(saved);
    }

    @Transactional(readOnly = true)
    public List<DeliveryPhotoResponse> listForDriver(Long driverId, Long matchId) {
        Match match = matchRepository.findById(matchId)
                .orElseThrow(() -> new CustomException(ErrorCode.MATCH_NOT_FOUND));
        if (match.getDriverId() == null || !match.getDriverId().equals(driverId)) {
            throw new CustomException(ErrorCode.AUTH_FORBIDDEN);
        }
        return deliveryPhotoRepository.findByMatchIdOrderByCreatedAtAsc(matchId)
                .stream()
                .map(DeliveryPhotoResponse::from)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<DeliveryPhotoResponse> listForShipper(Long shipperId, Long matchId) {
        Match match = matchRepository.findById(matchId)
                .orElseThrow(() -> new CustomException(ErrorCode.MATCH_NOT_FOUND));
        Quote quote = quoteRepository.findById(match.getQuoteId())
                .orElseThrow(() -> new CustomException(ErrorCode.INVALID_REQUEST));
        if (quote.getShipperId() == null || !quote.getShipperId().equals(shipperId)) {
            throw new CustomException(ErrorCode.AUTH_FORBIDDEN);
        }
        return deliveryPhotoRepository.findByMatchIdOrderByCreatedAtAsc(matchId)
                .stream()
                .map(DeliveryPhotoResponse::from)
                .toList();
    }

    @Transactional(readOnly = true)
    public ResponseEntity<Resource> download(Long photoId, Long userId, String role) {
        DeliveryPhoto photo = deliveryPhotoRepository.findById(photoId)
                .orElseThrow(() -> new CustomException(ErrorCode.INVALID_REQUEST));
        authorizeViewer(userId, role, photo.getMatchId());

        Path path = resolveStoragePath(photo.getStorageKey());
        if (!Files.exists(path)) {
            throw new CustomException(ErrorCode.INVALID_REQUEST);
        }

        try {
            Resource resource = new UrlResource(path.toUri());
            if (!resource.exists()) {
                throw new CustomException(ErrorCode.INVALID_REQUEST);
            }
            MediaType mediaType = MediaType.APPLICATION_OCTET_STREAM;
            if (photo.getMimeType() != null) {
                mediaType = MediaType.parseMediaType(photo.getMimeType());
            }
            return ResponseEntity.ok()
                    .contentType(mediaType)
                    .header(HttpHeaders.CONTENT_DISPOSITION, "inline")
                    .body(resource);
        } catch (IOException e) {
            throw new CustomException(ErrorCode.INTERNAL_ERROR);
        }
    }

    private void validateByStatus(Match.Status status, DeliveryPhoto.Type type) {
        if (status == Match.Status.CANCELLED || status == Match.Status.COMPLETED) {
            throw new CustomException(ErrorCode.INVALID_REQUEST);
        }
        if (type == DeliveryPhoto.Type.DELIVERY && status != Match.Status.IN_TRANSIT) {
            throw new CustomException(ErrorCode.INVALID_REQUEST);
        }
    }

    private void updateMatchStatusOnUpload(Match match, DeliveryPhoto.Type type) {
        if (type == DeliveryPhoto.Type.PICKUP && match.getStatus() == Match.Status.READY) {
            if (!paymentRepository.existsByMatchIdAndStatus(match.getMatchId(), Payment.PaymentStatus.COMPLETED)) {
                throw new CustomException(ErrorCode.MATCH_PAYMENT_REQUIRED);
            }
            match.startTransit();
        }
    }

    private void syncQuoteAndNotifyByStatusChange(Match.Status before, Match.Status after, Quote quote, Long matchId) {
        if (before == after) {
            return;
        }

        if (after == Match.Status.IN_TRANSIT) {
            quote.markInTransit();
            quoteRepository.save(quote);
            notificationService.createNotification(
                    FcmToken.UserType.SHIPPER,
                    quote.getShipperId(),
                    matchId,
                    Notification.Type.MATCH_UPDATED,
                    "상차 사진이 등록되어 운송이 시작되었습니다."
            );
            return;
        }

        if (after == Match.Status.COMPLETED) {
            quote.markDelivered();
            quoteRepository.save(quote);
            notificationService.createNotification(
                    FcmToken.UserType.SHIPPER,
                    quote.getShipperId(),
                    matchId,
                    Notification.Type.MATCH_UPDATED,
                    "하차 사진이 등록되었습니다. 화주 확인 후 정산을 확정해 주세요."
            );
        }
    }

    private void authorizeViewer(Long userId, String role, Long matchId) {
        Match match = matchRepository.findById(matchId)
                .orElseThrow(() -> new CustomException(ErrorCode.MATCH_NOT_FOUND));
        Quote quote = quoteRepository.findById(match.getQuoteId())
                .orElseThrow(() -> new CustomException(ErrorCode.INVALID_REQUEST));

        boolean isDriver = "ROLE_DRIVER".equals(role)
                && match.getDriverId() != null
                && match.getDriverId().equals(userId);
        boolean isShipper = "ROLE_SHIPPER".equals(role)
                && quote.getShipperId() != null
                && quote.getShipperId().equals(userId);
        if (!isDriver && !isShipper) {
            throw new CustomException(ErrorCode.AUTH_FORBIDDEN);
        }
    }

    private void storeFile(MultipartFile file, String storageKey) {
        Path fullPath = resolveStoragePath(storageKey);
        try {
            Files.createDirectories(fullPath.getParent());
            Files.copy(file.getInputStream(), fullPath, StandardCopyOption.REPLACE_EXISTING);
        } catch (IOException e) {
            throw new CustomException(ErrorCode.INTERNAL_ERROR);
        }
    }

    private String buildStorageKey(Long matchId, DeliveryPhoto.Type type, String ext) {
        String fileName = UUID.randomUUID() + ext;
        return "match/" + matchId + "/" + type.name().toLowerCase() + "/" + fileName;
    }

    private String resolveExtension(String originalName, String mimeType) {
        if (originalName != null && originalName.contains(".")) {
            String ext = sanitizeExtension(originalName.substring(originalName.lastIndexOf('.')));
            if (!ext.isBlank()) {
                return ext;
            }
        }
        if ("image/png".equalsIgnoreCase(mimeType)) {
            return ".png";
        }
        if ("image/webp".equalsIgnoreCase(mimeType)) {
            return ".webp";
        }
        if ("image/heic".equalsIgnoreCase(mimeType)) {
            return ".heic";
        }
        if ("image/heif".equalsIgnoreCase(mimeType)) {
            return ".heif";
        }
        return ".jpg";
    }

    private String normalizeStopLabel(String stopLabel) {
        if (stopLabel == null) {
            return null;
        }
        String trimmed = stopLabel.trim();
        if (trimmed.isEmpty()) {
            return null;
        }
        if (trimmed.length() > 255) {
            return trimmed.substring(0, 255);
        }
        return trimmed;
    }
    private Path resolveStoragePath(String storageKey) {
        if (storageKey == null || storageKey.isBlank()) {
            throw new CustomException(ErrorCode.INVALID_REQUEST);
        }

        Path root = Paths.get(storageDir).toAbsolutePath().normalize();
        Path target = root.resolve(storageKey).normalize();
        if (!target.startsWith(root)) {
            throw new CustomException(ErrorCode.INVALID_REQUEST);
        }
        return target;
    }

    private String sanitizeExtension(String extension) {
        String candidate = extension == null ? "" : extension.trim().toLowerCase(Locale.ROOT);
        if (!candidate.startsWith(".")) {
            candidate = "." + candidate;
        }
        candidate = candidate.replaceAll("[^a-z0-9.]", "");
        int dotCount = 0;
        for (int i = 0; i < candidate.length(); i++) {
            if (candidate.charAt(i) == '.') {
                dotCount++;
            }
        }
        if (dotCount != 1 || candidate.length() < 2 || candidate.length() > 10) {
            return "";
        }
        return candidate;
    }

    private boolean isAllowedImageMimeType(String mimeType) {
        if (mimeType == null || mimeType.isBlank()) {
            return false;
        }
        String normalized = mimeType.trim().toLowerCase(Locale.ROOT);
        int delimiterIndex = normalized.indexOf(';');
        if (delimiterIndex >= 0) {
            normalized = normalized.substring(0, delimiterIndex).trim();
        }
        return ALLOWED_IMAGE_CONTENT_TYPES.contains(normalized);
    }
}
