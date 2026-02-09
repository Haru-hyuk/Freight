package com.freight.backend.service;

import com.freight.backend.dto.checklist.ChecklistItemResponse;
import com.freight.backend.entity.ChecklistItem;
import com.freight.backend.repository.ChecklistItemRepository;
import java.util.List;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class ChecklistItemService {

    private final ChecklistItemRepository checklistItemRepository;

    public List<ChecklistItemResponse> listEnabledItems() {
        return checklistItemRepository.findByEnabledTrueOrderBySortOrderAsc().stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    private ChecklistItemResponse toResponse(ChecklistItem item) {
        return new ChecklistItemResponse(
                item.getChecklistItemId(),
                item.getCategory(),
                item.getName(),
                item.getIcon(),
                item.getHasExtraFee(),
                item.getBaseExtraFee(),
                item.getRequiresExtraInput(),
                item.getExtraInputLabel(),
                item.getSortOrder()
        );
    }
}
