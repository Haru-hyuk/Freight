package com.freight.backend.service;

import com.freight.backend.dto.announcement.AnnouncementCreateRequest;
import com.freight.backend.dto.announcement.AnnouncementResponse;
import com.freight.backend.dto.announcement.AnnouncementUpdateRequest;
import com.freight.backend.entity.Announcement;
import com.freight.backend.exception.CustomException;
import com.freight.backend.exception.ErrorCode;
import com.freight.backend.repository.AnnouncementRepository;
import java.util.List;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class AnnouncementService {

    private final AnnouncementRepository announcementRepository;

    @Transactional
    public AnnouncementResponse create(Long adminId, AnnouncementCreateRequest request) {
        Announcement announcement = Announcement.builder()
                .adminId(adminId)
                .title(request.getTitle())
                .content(request.getContent())
                .isPinned(request.getIsPinned())
                .build();
        if (Boolean.TRUE.equals(request.getPublish())) {
            announcement.publish();
        }
        Announcement saved = announcementRepository.save(announcement);
        return AnnouncementResponse.from(saved);
    }

    @Transactional
    public AnnouncementResponse update(Long announcementId, AnnouncementUpdateRequest request) {
        Announcement announcement = announcementRepository.findById(announcementId)
                .orElseThrow(() -> new CustomException(ErrorCode.INVALID_REQUEST));
        announcement.update(request.getTitle(), request.getContent(), request.getIsPinned());
        if (request.getPublish() != null) {
            if (Boolean.TRUE.equals(request.getPublish())) {
                announcement.publish();
            } else {
                announcement.unpublish();
            }
        }
        Announcement saved = announcementRepository.save(announcement);
        return AnnouncementResponse.from(saved);
    }

    @Transactional
    public void delete(Long announcementId) {
        if (!announcementRepository.existsById(announcementId)) {
            throw new CustomException(ErrorCode.INVALID_REQUEST);
        }
        announcementRepository.deleteById(announcementId);
    }

    @Transactional(readOnly = true)
    public AnnouncementResponse get(Long announcementId) {
        Announcement announcement = announcementRepository.findById(announcementId)
                .orElseThrow(() -> new CustomException(ErrorCode.INVALID_REQUEST));
        return AnnouncementResponse.from(announcement);
    }

    @Transactional(readOnly = true)
    public List<AnnouncementResponse> listAll() {
        return announcementRepository.findAllByOrderByCreatedAtDesc()
                .stream()
                .map(AnnouncementResponse::from)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<AnnouncementResponse> listPublished() {
        return announcementRepository.findAllByPublishedAtIsNotNullOrderByIsPinnedDescPublishedAtDescCreatedAtDesc()
                .stream()
                .map(AnnouncementResponse::from)
                .collect(Collectors.toList());
    }
}
