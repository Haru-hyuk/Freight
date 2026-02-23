package com.freight.backend.service;

import com.freight.backend.dto.delivery.DeliveryPhotoResponse;
import com.freight.backend.entity.DeliveryPhoto;
import com.freight.backend.entity.Match;
import com.freight.backend.entity.Quote;
import com.freight.backend.exception.CustomException;
import com.freight.backend.exception.ErrorCode;
import com.freight.backend.repository.DeliveryPhotoRepository;
import com.freight.backend.repository.MatchRepository;
import com.freight.backend.repository.QuoteRepository;
import java.io.IOException;
import java.math.BigDecimal;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.time.LocalDateTime;
import java.util.List;
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

@Service
@RequiredArgsConstructor
public class DeliveryPhotoService {

    private final DeliveryPhotoRepository deliveryPhotoRepository;
    private final MatchRepository matchRepository;
    private final QuoteRepository quoteRepository;

    @Value("${delivery-photo.storage-dir:uploads/delivery-photos}")
    private String storageDir;

    @Transactional
    public DeliveryPhotoResponse uploadByDriver(
            Long driverId,
            Long matchId,
            DeliveryPhoto.Type type,
            MultipartFile file,
            LocalDateTime takenAt,
            BigDecimal lat,
            BigDecimal lng
    ) {
        if (type == null || file == null || file.isEmpty()) {
            throw new CustomException(ErrorCode.INVALID_REQUEST);
        }
        String mimeType = file.getContentType();
        if (mimeType == null || !mimeType.startsWith("image/")) {
            throw new CustomException(ErrorCode.INVALID_REQUEST);
        }

        Match match = matchRepository.findById(matchId)
                .orElseThrow(() -> new CustomException(ErrorCode.MATCH_NOT_FOUND));
        if (match.getDriverId() == null || !match.getDriverId().equals(driverId)) {
            throw new CustomException(ErrorCode.AUTH_FORBIDDEN);
        }
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
                .build();
        DeliveryPhoto saved = deliveryPhotoRepository.save(photo);
        saved.updateFileUrl("/api/delivery-photos/" + saved.getPhotoId() + "/file");

        updateMatchStatusOnUpload(match, type);
        matchRepository.save(match);

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
        if (!quote.getShipperId().equals(shipperId)) {
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

        Path path = Paths.get(storageDir).resolve(photo.getStorageKey()).normalize();
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
            match.startTransit();
            return;
        }
        if (type == DeliveryPhoto.Type.DELIVERY && match.getStatus() == Match.Status.IN_TRANSIT) {
            match.complete();
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
                && quote.getShipperId().equals(userId);
        if (!isDriver && !isShipper) {
            throw new CustomException(ErrorCode.AUTH_FORBIDDEN);
        }
    }

    private void storeFile(MultipartFile file, String storageKey) {
        Path fullPath = Paths.get(storageDir).resolve(storageKey).normalize();
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
            return originalName.substring(originalName.lastIndexOf('.'));
        }
        if ("image/png".equalsIgnoreCase(mimeType)) {
            return ".png";
        }
        if ("image/webp".equalsIgnoreCase(mimeType)) {
            return ".webp";
        }
        return ".jpg";
    }
}

