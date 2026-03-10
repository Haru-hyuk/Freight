package com.freight.backend.service;

import com.freight.backend.dto.truck.TruckCreateRequest;
import com.freight.backend.dto.truck.TruckCreateResponse;
import com.freight.backend.dto.truck.TruckResponse;
import com.freight.backend.dto.truck.TruckUpdateRequest;
import com.freight.backend.entity.Driver;
import com.freight.backend.entity.Truck;
import com.freight.backend.exception.CustomException;
import com.freight.backend.exception.ErrorCode;
import com.freight.backend.gpsload.loadplan.repository.TruckSpecCatalogRepository;
import com.freight.backend.repository.DriverRepository;
import com.freight.backend.repository.TruckRepository;
import jakarta.transaction.Transactional;
import java.sql.Date;
import java.sql.Timestamp;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Locale;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
@Slf4j
public class TruckService {
    private final TruckRepository truckRepository;
    private final DriverRepository driverRepository;
    private final TruckSpecCatalogRepository truckSpecCatalogRepository;
    private final JdbcTemplate jdbcTemplate;

    @Transactional
    public TruckCreateResponse createTruck(TruckCreateRequest req) {
        Long driverId = getCurrentDriverId();
        Long truckId = resolveTruckIdForCreate();

        Truck truck = Truck.builder()
                .truckId(truckId)
                .driverId(driverId)
                .vehicleType(normalizeVehicleType(req.getVehicleType()))
                .vehicleBodyType(normalizeVehicleBodyType(req.getVehicleBodyType()))
                .tonnage(req.getTonnage())
                .maxWeight(req.getMaxWeight())
                .maxVolume(req.getMaxVolume())
                .cargoLength(req.getCargoLength())
                .cargoWidth(req.getCargoWidth())
                .cargoHeight(req.getCargoHeight())
                .name(req.getName())
                .imageUrl(req.getImageUrl())
                // 승인 상태는 기사 요청값을 신뢰하지 않고 서버에서 강제한다.
                .approved(Boolean.FALSE)
                .insurance(req.getInsurance())
                .odometerKm(req.getOdometerKm())
                .lastInspectionDate(req.getLastInspectionDate())
                .build();

        if (truckId != null) {
            insertTruckManually(truck);
            return new TruckCreateResponse(truckId);
        }

        Truck saved = truckRepository.save(truck);
        return new TruckCreateResponse(saved.getTruckId());
    }

    private void insertTruckManually(Truck truck) {
        LocalDateTime now = LocalDateTime.now();
        jdbcTemplate.update(
                """
                INSERT INTO trucks (
                    truck_id, approval_status, approved, cargo_height, cargo_length, cargo_width, created_at,
                    driver_id, image_url, insurance, last_inspection_date, max_volume, max_weight, name,
                    odometer_km, review_memo, tonnage, updated_at, vehicle_body_type, vehicle_type
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                truck.getTruckId(),
                "PENDING",
                Boolean.FALSE,
                truck.getCargoHeight(),
                truck.getCargoLength(),
                truck.getCargoWidth(),
                Timestamp.valueOf(now),
                truck.getDriverId(),
                truck.getImageUrl(),
                truck.getInsurance(),
                truck.getLastInspectionDate() == null ? null : Date.valueOf(truck.getLastInspectionDate()),
                truck.getMaxVolume(),
                truck.getMaxWeight(),
                truck.getName(),
                truck.getOdometerKm(),
                null,
                truck.getTonnage(),
                Timestamp.valueOf(now),
                truck.getVehicleBodyType(),
                truck.getVehicleType()
        );
    }

    private Long resolveTruckIdForCreate() {
        try {
            long autoIncrementColumns = truckRepository.countTruckIdAutoIncrementColumns();
            if (autoIncrementColumns > 0) {
                return null;
            }
            Long nextTruckId = truckRepository.findNextTruckIdCandidate();
            if (nextTruckId != null && nextTruckId > 0) {
                log.warn("Schema fallback: trucks.truck_id is not AUTO_INCREMENT. Assigning manual truckId={}", nextTruckId);
                return nextTruckId;
            }
        } catch (Exception e) {
            log.warn("Failed to inspect trucks.truck_id auto increment state. Falling back to JPA identity. cause={}", e.getMessage());
        }
        return null;
    }

    @Transactional
    public List<TruckResponse> listTrucks() {
        Driver driver = getCurrentDriver();
        Long driverId = driver.getDriverId();
        Long selectedTruckId = driver.getSelectedTruckId();
        return truckRepository.findByDriverId(driverId).stream()
                .map(truck -> toResponse(truck, selectedTruckId))
                .collect(Collectors.toList());
    }

    @Transactional
    public TruckResponse getTruck(Long truckId) {
        Driver driver = getCurrentDriver();
        Truck truck = getOwnedTruck(truckId, driver.getDriverId());
        return toResponse(truck, driver.getSelectedTruckId());
    }

    @Transactional
    public TruckResponse updateTruck(Long truckId, TruckUpdateRequest req) {
        Driver driver = getCurrentDriver();
        Long driverId = driver.getDriverId();
        Truck truck = getOwnedTruck(truckId, driverId);
        truck.updateFrom(
                normalizeVehicleType(req.getVehicleType()),
                normalizeVehicleBodyType(req.getVehicleBodyType()),
                req.getTonnage(),
                req.getMaxWeight(),
                req.getMaxVolume(),
                req.getCargoLength(),
                req.getCargoWidth(),
                req.getCargoHeight(),
                req.getName(),
                req.getImageUrl(),
                req.getInsurance(),
                req.getOdometerKm(),
                req.getLastInspectionDate()
        );
        // 수정된 차량은 재심사 상태가 되므로 선택 상태를 해제한다.
        if (driver.getSelectedTruckId() != null && driver.getSelectedTruckId().equals(truckId)) {
            driver.clearSelectedTruck();
            driverRepository.save(driver);
        }
        return toResponse(truck, driver.getSelectedTruckId());
    }

    @Transactional
    public void deleteTruck(Long truckId) {
        Driver driver = getCurrentDriver();
        Long driverId = driver.getDriverId();
        Truck truck = getOwnedTruck(truckId, driverId);
        truckRepository.delete(truck);
        if (driver.getSelectedTruckId() != null && driver.getSelectedTruckId().equals(truckId)) {
            driver.clearSelectedTruck();
            driverRepository.save(driver);
        }
    }

    @Transactional
    public TruckResponse getActiveTruck() {
        Driver driver = getCurrentDriver();
        Truck selected = resolveSelectedOrFallbackApprovedTruck(driver);
        return toResponse(selected, driver.getSelectedTruckId());
    }

    @Transactional
    public TruckResponse selectActiveTruck(Long truckId) {
        Driver driver = getCurrentDriver();
        Long driverId = driver.getDriverId();
        Truck truck = getOwnedTruck(truckId, driverId);
        if (!isTruckApproved(truck)) {
            throw new CustomException(ErrorCode.INVALID_REQUEST);
        }
        driver.selectTruck(truckId);
        driverRepository.save(driver);
        return toResponse(truck, truckId);
    }

    @Transactional
    public List<TruckResponse> listPendingTrucksForAdmin() {
        assertAdmin();
        // 관리자 대기 목록은 조건 쿼리로 조회해 대량 데이터에서 메모리 필터를 피한다.
        return truckRepository.findPendingApprovals().stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    @Transactional
    public TruckResponse updateApprovalForAdmin(Long truckId, Boolean approved) {
        assertAdmin();
        if (approved == null) {
            throw new CustomException(ErrorCode.INVALID_REQUEST);
        }

        Truck truck = truckRepository.findById(truckId)
                .orElseThrow(() -> new CustomException(ErrorCode.INVALID_REQUEST));

        truck.setApprovedStatus(approved);
        Truck saved = truckRepository.save(truck);
        // 반려된 차량이 선택되어 있었다면 선택을 해제한다.
        if (!approved) {
            driverRepository.findById(saved.getDriverId()).ifPresent(driver -> {
                if (driver.getSelectedTruckId() != null && driver.getSelectedTruckId().equals(saved.getTruckId())) {
                    driver.clearSelectedTruck();
                    driverRepository.save(driver);
                }
            });
        }
        return toResponse(saved, null);
    }

    private Truck getOwnedTruck(Long truckId, Long driverId) {
        Truck truck = truckRepository.findById(truckId)
                .orElseThrow(() -> new CustomException(ErrorCode.INVALID_REQUEST));
        if (!driverId.equals(truck.getDriverId())) {
            throw new CustomException(ErrorCode.AUTH_FORBIDDEN);
        }
        return truck;
    }

    private Truck resolveSelectedOrFallbackApprovedTruck(Driver driver) {
        Long driverId = driver.getDriverId();
        Long selectedTruckId = driver.getSelectedTruckId();

        if (selectedTruckId != null) {
            Truck selected = truckRepository.findById(selectedTruckId)
                    .orElseThrow(() -> new CustomException(ErrorCode.DRIVER_TRUCK_REQUIRED));
            if (!driverId.equals(selected.getDriverId())) {
                throw new CustomException(ErrorCode.AUTH_FORBIDDEN);
            }
            if (isTruckApproved(selected)) {
                return selected;
            }
        }

        Truck approvedFallback = truckRepository.findByDriverId(driverId).stream()
                .filter(this::isTruckApproved)
                .findFirst()
                .orElseThrow(() -> new CustomException(ErrorCode.DRIVER_TRUCK_REQUIRED));

        if (selectedTruckId == null || !selectedTruckId.equals(approvedFallback.getTruckId())) {
            driver.selectTruck(approvedFallback.getTruckId());
            driverRepository.save(driver);
        }
        return approvedFallback;
    }

    private boolean isTruckApproved(Truck truck) {
        if (truck == null || !Boolean.TRUE.equals(truck.getApproved())) {
            return false;
        }
        String approvalStatus = truck.getApprovalStatus();
        if (approvalStatus == null || approvalStatus.isBlank()) {
            return true;
        }
        return "APPROVED".equalsIgnoreCase(approvalStatus);
    }

    private TruckResponse toResponse(Truck truck, Long selectedTruckId) {
        boolean selected = selectedTruckId != null && selectedTruckId.equals(truck.getTruckId());
        return new TruckResponse(
                truck.getTruckId(),
                truck.getDriverId(),
                truck.getVehicleType(),
                truck.getVehicleBodyType(),
                truck.getTonnage(),
                truck.getMaxWeight(),
                truck.getMaxVolume(),
                truck.getCargoLength(),
                truck.getCargoWidth(),
                truck.getCargoHeight(),
                truck.getName(),
                truck.getImageUrl(),
                truck.getApproved(),
                truck.getApprovalStatus(),
                truck.getReviewMemo(),
                selected,
                truck.getInsurance(),
                truck.getOdometerKm(),
                truck.getLastInspectionDate(),
                truck.getCreatedAt(),
                truck.getUpdatedAt()
        );
    }

    private TruckResponse toResponse(Truck truck) {
        return toResponse(truck, null);
    }

    private Driver getCurrentDriver() {
        Long driverId = getCurrentDriverId();
        return driverRepository.findById(driverId)
                .orElseThrow(() -> new CustomException(ErrorCode.AUTH_FORBIDDEN));
    }

    private Long getCurrentDriverId() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.isAuthenticated()) {
            throw new CustomException(ErrorCode.AUTH_UNAUTHORIZED);
        }
        boolean isDriver = authentication.getAuthorities().stream()
                .map(GrantedAuthority::getAuthority)
                .anyMatch("ROLE_DRIVER"::equals);
        if (!isDriver) {
            throw new CustomException(ErrorCode.AUTH_FORBIDDEN);
        }
        return Long.valueOf(authentication.getName());
    }

    private String normalizeVehicleType(String raw) {
        if (raw == null) {
            return null;
        }
        String upper = raw.trim().toUpperCase(Locale.ROOT);
        if (upper.isBlank()) {
            return null;
        }
        upper = upper.replace('-', '_').replace(' ', '_').replaceAll("_+", "_");

        String canonicalFromExact = resolveCanonicalVehicleType(upper);
        if (canonicalFromExact != null) {
            return canonicalFromExact;
        }

        String compact = upper.replace("_", "");
        String canonicalFromCompact = resolveCanonicalVehicleTypeByCompactCode(compact);
        if (canonicalFromCompact != null) {
            return canonicalFromCompact;
        }

        if (compact.startsWith("TON") && compact.length() > 3 && !upper.contains("_")) {
            String candidate = "TON_" + compact.substring(3);
            String canonicalFromCandidate = resolveCanonicalVehicleType(candidate);
            return canonicalFromCandidate != null ? canonicalFromCandidate : candidate;
        }

        return upper;
    }

    private String resolveCanonicalVehicleType(String vehicleType) {
        if (vehicleType == null || vehicleType.isBlank()) {
            return null;
        }
        List<String> candidates = truckSpecCatalogRepository.findCanonicalVehicleTypes(vehicleType);
        return candidates.isEmpty() ? null : candidates.get(0);
    }

    private String resolveCanonicalVehicleTypeByCompactCode(String compactVehicleType) {
        if (compactVehicleType == null || compactVehicleType.isBlank()) {
            return null;
        }
        List<String> candidates = truckSpecCatalogRepository.findCanonicalVehicleTypesByCompactCode(compactVehicleType);
        return candidates.isEmpty() ? null : candidates.get(0);
    }

    private String normalizeVehicleBodyType(String raw) {
        if (raw == null) {
            return null;
        }
        String upper = raw.trim().toUpperCase(Locale.ROOT);
        if (upper.isBlank()) {
            return null;
        }
        upper = upper.replace('-', '_').replace(' ', '_').replaceAll("_+", "_");
        if ("WINGBODY".equals(upper)) return "WING_BODY";
        if ("CARGO_TRUCK".equals(upper) || "GENERAL".equals(upper)) return "CARGO";
        if ("TOP_OPEN".equals(upper) || "TOPLOAD".equals(upper)) return "TOP";
        return upper;
    }

    private void assertAdmin() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.isAuthenticated()) {
            throw new CustomException(ErrorCode.AUTH_UNAUTHORIZED);
        }
        boolean isAdmin = authentication.getAuthorities().stream()
                .map(GrantedAuthority::getAuthority)
                .anyMatch(authority ->
                        "ROLE_ADMIN".equals(authority)
                                || "ROLE_SUPER".equals(authority)
                                || "ROLE_OPERATOR".equals(authority)
                                || "ROLE_CS".equals(authority)
                );
        if (!isAdmin) {
            throw new CustomException(ErrorCode.AUTH_FORBIDDEN);
        }
    }
}

