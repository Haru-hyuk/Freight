package com.freight.backend.controller;

import com.freight.backend.dto.checklist.ChecklistItemResponse;
import com.freight.backend.service.ChecklistItemService;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/checklist-items")
@RequiredArgsConstructor
public class ChecklistItemController {

    private final ChecklistItemService checklistItemService;

    @GetMapping
    public ResponseEntity<List<ChecklistItemResponse>> listChecklistItems() {
        return ResponseEntity.ok(checklistItemService.listEnabledItems());
    }
}
