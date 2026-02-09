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

        Truck truck = Truck.builder()
                .driverId(driverId)
                .vehicleType(req.getVehicleType())
                .tonnage(req.getTonnage())
                .maxWeight(req.getMaxWeight())
                .maxVolume(req.getMaxVolume())
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
                req.getTonnage(),
                req.getMaxWeight(),
                req.getMaxVolume(),
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
                truck.getTonnage(),
                truck.getMaxWeight(),
                truck.getMaxVolume(),
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
        String principal = String.valueOf(authentication.getPrincipal());
        return Long.valueOf(principal);
    }
}
