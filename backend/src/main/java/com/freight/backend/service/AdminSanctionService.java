package com.freight.backend.service;

import com.freight.backend.dto.admin.AdminSanctionCreateRequest;
import com.freight.backend.entity.Driver;
import com.freight.backend.entity.SanctionEvent;
import com.freight.backend.entity.Shipper;
import com.freight.backend.exception.CustomException;
import com.freight.backend.exception.ErrorCode;
import com.freight.backend.repository.DriverRepository;
import com.freight.backend.repository.SanctionEventRepository;
import com.freight.backend.repository.ShipperRepository;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class AdminSanctionService {

    private final SanctionEventRepository sanctionEventRepository;
    private final DriverRepository driverRepository;
    private final ShipperRepository shipperRepository;

    @Transactional(readOnly = true)
    public List<Map<String, Object>> listSanctions() {
        return sanctionEventRepository.findAllByOrderByCreatedAtDesc().stream()
                .map(this::toRow)
                .toList();
    }

    @Transactional
    public Map<String, Object> createSanction(Long adminId, AdminSanctionCreateRequest request) {
        if (request == null || request.getTargetId() == null || request.getType() == null || request.getReason() == null) {
            throw new CustomException(ErrorCode.INVALID_REQUEST);
        }

        String targetId = request.getTargetId().trim();
        String type = normalizeType(request.getType());
        if (targetId.isEmpty() || request.getReason().trim().isEmpty()) {
            throw new CustomException(ErrorCode.INVALID_REQUEST);
        }

        Target target = resolveTarget(targetId);
        applyStatusBySanctionType(target, type);

        SanctionEvent event = SanctionEvent.builder()
                .targetId(targetId)
                .targetRole(target.role())
                .targetName(target.name())
                .type(type)
                .status("APPLIED")
                .reason(request.getReason().trim())
                .amount(request.getAmount())
                .adminId(adminId)
                .build();

        SanctionEvent saved = sanctionEventRepository.save(event);
        return toRow(saved);
    }

    @Transactional
    public Map<String, Object> releaseSanction(Long sanctionId) {
        SanctionEvent event = sanctionEventRepository.findById(sanctionId)
                .orElseThrow(() -> new CustomException(ErrorCode.INVALID_REQUEST));
        event.release();
        sanctionEventRepository.save(event);

        Target target = resolveTarget(event.getTargetId());
        applyStatus(target, "ACTIVE");

        return toRow(event);
    }

    private Map<String, Object> toRow(SanctionEvent event) {
        Map<String, Object> row = new LinkedHashMap<>();
        row.put("id", "S-" + event.getSanctionId());
        row.put("target_id", event.getTargetId());
        row.put("target_role", event.getTargetRole());
        row.put("target_name", event.getTargetName());
        row.put("type", event.getType());
        row.put("status", event.getStatus());
        row.put("reason", event.getReason());
        row.put("amount", event.getAmount());
        row.put("created_at", event.getCreatedAt() == null ? null : event.getCreatedAt().toString());
        return row;
    }

    private String normalizeType(String type) {
        String t = type.trim().toUpperCase(Locale.ROOT);
        if ("WARNING".equals(t) || "FINE".equals(t) || "SUSPEND".equals(t) || "DRIVE_BLOCK".equals(t)) {
            return t;
        }
        throw new CustomException(ErrorCode.INVALID_REQUEST);
    }

    private void applyStatusBySanctionType(Target target, String type) {
        if ("SUSPEND".equals(type)) {
            applyStatus(target, "SUSPENDED");
            return;
        }
        if ("DRIVE_BLOCK".equals(type)) {
            applyStatus(target, "DRIVING_BLOCKED");
        }
    }

    private void applyStatus(Target target, String status) {
        if ("SHIPPER".equals(target.role())) {
            Shipper shipper = shipperRepository.findById(target.id())
                    .orElseThrow(() -> new CustomException(ErrorCode.INVALID_REQUEST));
            shipper.updateStatus(status);
            shipperRepository.save(shipper);
            return;
        }
        Driver driver = driverRepository.findById(target.id())
                .orElseThrow(() -> new CustomException(ErrorCode.INVALID_REQUEST));
        driver.updateStatus(status);
        driverRepository.save(driver);
    }

    private Target resolveTarget(String targetId) {
        if (!targetId.contains("-")) {
            throw new CustomException(ErrorCode.INVALID_REQUEST);
        }
        String[] parts = targetId.split("-", 2);
        if (parts.length < 2 || parts[1].isBlank()) {
            throw new CustomException(ErrorCode.INVALID_REQUEST);
        }
        String prefix = parts[0].toUpperCase(Locale.ROOT);
        Long id;
        try {
            id = Long.parseLong(parts[1]);
        } catch (NumberFormatException e) {
            throw new CustomException(ErrorCode.INVALID_REQUEST);
        }

        if ("S".equals(prefix)) {
            Shipper shipper = shipperRepository.findById(id)
                    .orElseThrow(() -> new CustomException(ErrorCode.INVALID_REQUEST));
            return new Target(id, "SHIPPER", shipper.getName());
        }
        if ("D".equals(prefix)) {
            Driver driver = driverRepository.findById(id)
                    .orElseThrow(() -> new CustomException(ErrorCode.INVALID_REQUEST));
            return new Target(id, "DRIVER", driver.getName());
        }
        throw new CustomException(ErrorCode.INVALID_REQUEST);
    }

    private record Target(Long id, String role, String name) {}
}
