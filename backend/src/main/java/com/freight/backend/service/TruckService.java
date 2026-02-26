package com.freight.backend.service;

import com.freight.backend.dto.truck.TruckCreateRequest;
import com.freight.backend.dto.truck.TruckCreateResponse;
import com.freight.backend.dto.truck.TruckResponse;
import com.freight.backend.dto.truck.TruckUpdateRequest;
import com.freight.backend.entity.Truck;
import com.freight.backend.exception.CustomException;
import com.freight.backend.exception.ErrorCode;
import com.freight.backend.repository.TruckRepository;
import jakarta.transaction.Transactional;
import java.util.List;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class TruckService {

    private final TruckRepository truckRepository;

    @Transactional
    public TruckCreateResponse createTruck(TruckCreateRequest req) {
        Long driverId = getCurrentDriverId();
        Long nextTruckId = truckRepository.findMaxTruckId() + 1L;

        Truck truck = Truck.builder()
                .truckId(nextTruckId)
                .driverId(driverId)
                .vehicleType(req.getVehicleType())
                .vehicleBodyType(req.getVehicleBodyType())
                .tonnage(req.getTonnage())
                .maxWeight(req.getMaxWeight())
                .maxVolume(req.getMaxVolume())
                .cargoLength(req.getCargoLength())
                .cargoWidth(req.getCargoWidth())
                .cargoHeight(req.getCargoHeight())
                .name(req.getName())
                .imageUrl(req.getImageUrl())
                .approved(req.getApproved())
                .insurance(req.getInsurance())
                .odometerKm(req.getOdometerKm())
                .lastInspectionDate(req.getLastInspectionDate())
                .build();

        Truck saved = truckRepository.save(truck);
        return new TruckCreateResponse(saved.getTruckId());
    }

    @Transactional
    public List<TruckResponse> listTrucks() {
        Long driverId = getCurrentDriverId();
        return truckRepository.findByDriverId(driverId).stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    @Transactional
    public TruckResponse getTruck(Long truckId) {
        Long driverId = getCurrentDriverId();
        Truck truck = getOwnedTruck(truckId, driverId);
        return toResponse(truck);
    }

    @Transactional
    public TruckResponse updateTruck(Long truckId, TruckUpdateRequest req) {
        Long driverId = getCurrentDriverId();
        Truck truck = getOwnedTruck(truckId, driverId);
        truck.updateFrom(
                req.getVehicleType(),
                req.getVehicleBodyType(),
                req.getTonnage(),
                req.getMaxWeight(),
                req.getMaxVolume(),
                req.getCargoLength(),
                req.getCargoWidth(),
                req.getCargoHeight(),
                req.getName(),
                req.getImageUrl(),
                req.getApproved(),
                req.getInsurance(),
                req.getOdometerKm(),
                req.getLastInspectionDate()
        );
        return toResponse(truck);
    }

    @Transactional
    public void deleteTruck(Long truckId) {
        Long driverId = getCurrentDriverId();
        Truck truck = getOwnedTruck(truckId, driverId);
        truckRepository.delete(truck);
    }

    @Transactional
    public List<TruckResponse> listPendingTrucksForAdmin() {
        assertAdmin();
        return truckRepository.findByApprovedFalseOrderByCreatedAtDesc().stream()
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
        return toResponse(saved);
    }

    private Truck getOwnedTruck(Long truckId, Long driverId) {
        Truck truck = truckRepository.findById(truckId)
                .orElseThrow(() -> new CustomException(ErrorCode.INVALID_REQUEST));
        if (!driverId.equals(truck.getDriverId())) {
            throw new CustomException(ErrorCode.AUTH_FORBIDDEN);
        }
        return truck;
    }

    private TruckResponse toResponse(Truck truck) {
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
                truck.getInsurance(),
                truck.getOdometerKm(),
                truck.getLastInspectionDate(),
                truck.getCreatedAt(),
                truck.getUpdatedAt()
        );
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

    private void assertAdmin() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.isAuthenticated()) {
            throw new CustomException(ErrorCode.AUTH_UNAUTHORIZED);
        }
        boolean isAdmin = authentication.getAuthorities().stream()
                .map(GrantedAuthority::getAuthority)
                .anyMatch("ROLE_ADMIN"::equals);
        if (!isAdmin) {
            throw new CustomException(ErrorCode.AUTH_FORBIDDEN);
        }
    }
}

