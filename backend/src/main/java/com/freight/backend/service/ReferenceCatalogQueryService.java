package com.freight.backend.service;

import com.freight.backend.dto.reference.PricingRateReferenceResponse;
import com.freight.backend.dto.reference.TruckSpecReferenceResponse;
import com.freight.backend.exception.CustomException;
import com.freight.backend.exception.ErrorCode;
import com.freight.backend.gpsload.loadplan.entity.TruckSpecCatalog;
import com.freight.backend.gpsload.loadplan.repository.TruckSpecCatalogRepository;
import com.freight.backend.pricing.DistanceRangeResolver;
import com.freight.backend.pricing.PricingRateCatalog;
import com.freight.backend.pricing.PricingRateCatalogRepository;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * 기준표 조회 전용 서비스.
 * 프론트에서 차종/운임 기준값을 조회할 때 사용한다.
 */
@Service
@RequiredArgsConstructor
public class ReferenceCatalogQueryService {

    private final TruckSpecCatalogRepository truckSpecCatalogRepository;
    private final PricingRateCatalogRepository pricingRateCatalogRepository;

    @Transactional(readOnly = true)
    public List<TruckSpecReferenceResponse> getTruckSpecs(String vehicleType) {
        List<TruckSpecCatalog> rows;
        if (vehicleType == null || vehicleType.isBlank()) {
            rows = truckSpecCatalogRepository.findAllByOrderByVehicleTypeAscVehicleBodyTypeAsc();
        } else {
            rows = truckSpecCatalogRepository.findByVehicleTypeOrderByVehicleBodyTypeAsc(vehicleType.trim().toUpperCase());
        }
        return rows.stream().map(this::toTruckSpecResponse).toList();
    }

    @Transactional(readOnly = true)
    public List<PricingRateReferenceResponse> getPricingRates(String vehicleType) {
        List<PricingRateCatalog> rows;
        if (vehicleType == null || vehicleType.isBlank()) {
            rows = pricingRateCatalogRepository.findAllByOrderByVehicleTypeAscMinDistanceKmAsc();
        } else {
            rows = pricingRateCatalogRepository.findByVehicleTypeOrderByMinDistanceKmAsc(vehicleType.trim().toUpperCase());
        }
        return rows.stream().map(this::toPricingRateResponse).toList();
    }

    @Transactional(readOnly = true)
    public PricingRateReferenceResponse getPricingRate(int distanceKm, String vehicleType) {
        if (vehicleType == null || vehicleType.isBlank()) {
            throw new CustomException(ErrorCode.INVALID_REQUEST);
        }
        String rangeKey = DistanceRangeResolver.resolveKey(distanceKm);
        if (rangeKey == null) {
            throw new CustomException(ErrorCode.INVALID_REQUEST);
        }
        PricingRateCatalog row = pricingRateCatalogRepository
                .findByRangeKeyAndVehicleType(rangeKey, vehicleType.trim().toUpperCase())
                .orElseThrow(() -> new CustomException(ErrorCode.INVALID_REQUEST));
        return toPricingRateResponse(row);
    }

    private TruckSpecReferenceResponse toTruckSpecResponse(TruckSpecCatalog row) {
        return new TruckSpecReferenceResponse(
                row.getVehicleType(),
                row.getVehicleTypeKr(),
                row.getVehicleBodyType(),
                row.getCategoryKr(),
                row.getTonnage(),
                row.getMaxWeight(),
                row.getMaxWeightDisplay(),
                row.getMaxVolume(),
                row.getCargoLengthCm(),
                row.getCargoWidthCm(),
                row.getCargoHeightCm(),
                row.getPalletCount(),
                row.getPalletStandardMm(),
                row.getDoorPosition(),
                row.getSourceName()
        );
    }

    private PricingRateReferenceResponse toPricingRateResponse(PricingRateCatalog row) {
        return new PricingRateReferenceResponse(
                row.getRangeKey(),
                row.getMinDistanceKm(),
                row.getMaxDistanceKm(),
                row.getVehicleType(),
                row.getBaseRateWon(),
                row.getSourceName()
        );
    }
}
