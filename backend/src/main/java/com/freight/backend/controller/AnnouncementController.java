package com.freight.backend.controller;

import com.freight.backend.dto.announcement.AnnouncementResponse;
import com.freight.backend.service.AnnouncementService;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/announcements")
@RequiredArgsConstructor
public class AnnouncementController {

    private final AnnouncementService announcementService;

    @GetMapping
    public ResponseEntity<List<AnnouncementResponse>> listPublished() {
        return ResponseEntity.ok(announcementService.listPublished());
    }

    @GetMapping("/{announcementId}")
    public ResponseEntity<AnnouncementResponse> get(@PathVariable Long announcementId) {
        return ResponseEntity.ok(announcementService.get(announcementId));
    }
}
