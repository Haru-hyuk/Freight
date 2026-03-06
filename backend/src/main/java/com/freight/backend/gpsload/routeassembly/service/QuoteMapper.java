package com.freight.backend.gpsload.routeassembly.service;

import com.freight.backend.entity.QuoteItem;
import com.freight.backend.entity.QuoteStop;
import com.freight.backend.gpsload.loadplan.model.CargoHandling;
import com.freight.backend.gpsload.route.model.Place;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;

/**
 * Quote 변환 계층
 * entity.Quote (JPA) <-> routeassembly.model.Quote (알고리즘용) 간 변환
 *
 * <h3>변환 방향</h3>
 * <ul>
 *   <li>toAssemblyQuote: JPA 엔티티 → 알고리즘 모델 (경로 추천/적재 계획용)</li>
 *   <li>필드 매핑 계약은 이 클래스에서 단일 관리</li>
 * </ul>
 */
@Component
public class QuoteMapper {

    /**
     * JPA Quote 엔티티를 알고리즘용 Quote 레코드로 변환
     *
     * @param entity   JPA Quote 엔티티
     * @param stops    경유지 목록 (QuoteStopRepository에서 조회)
     * @param items    화물 아이템 목록 (QuoteItemRepository에서 조회)
     * @return 알고리즘용 Quote 레코드
     */
    public com.freight.backend.gpsload.routeassembly.model.Quote toAssemblyQuote(
            com.freight.backend.entity.Quote entity,
            List<QuoteStop> stops,
            List<QuoteItem> items
    ) {
        if (entity == null) {
            return null;
        }

        // 기본 좌표 변환
        Place origin = new Place(
                null,
                entity.getOriginAddress(),
                entity.getOriginLat(),
                entity.getOriginLng()
        );
        Place destination = new Place(
                null,
                entity.getDestinationAddress(),
                entity.getDestinationLat(),
                entity.getDestinationLng()
        );

        // 경유지 변환
        List<Place> waypoints = toWaypoints(stops);

        // 아이템 집계 (치수, 취급 정보)
        AggregatedItemInfo itemInfo = aggregateItems(items, entity);

        return new com.freight.backend.gpsload.routeassembly.model.Quote(
                entity.getQuoteId(),
                origin,
                destination,
                waypoints,
                itemInfo.volumeCbm,
                itemInfo.weightKg,
                entity.getAllowCombine(),
                entity.getFinalPrice() != null ? entity.getFinalPrice().doubleValue() : null,
                entity.getPickupScheduleStart(),
                entity.getDeliveryDeadline(),
                entity.getDeliverySchedule(),
                itemInfo.lengthCm,
                itemInfo.widthCm,
                itemInfo.heightCm,
                itemInfo.rotatable,
                itemInfo.stackable,
                itemInfo.fragile,
                itemInfo.noStack,
                itemInfo.bottomOnly,
                itemInfo.maxStackWeight,
                entity.getStatus(),
                itemInfo.handling
        );
    }

    /**
     * 간단한 변환 (경유지/아이템 없이)
     */
    public com.freight.backend.gpsload.routeassembly.model.Quote toAssemblyQuoteSimple(
            com.freight.backend.entity.Quote entity
    ) {
        return toAssemblyQuote(entity, List.of(), List.of());
    }

    private List<Place> toWaypoints(List<QuoteStop> stops) {
        if (stops == null || stops.isEmpty()) {
            return List.of();
        }
        List<Place> waypoints = new ArrayList<>();
        for (QuoteStop stop : stops) {
            if (stop == null || stop.getLat() == null || stop.getLng() == null) {
                continue;
            }
            waypoints.add(new Place(null, stop.getAddress(), stop.getLat(), stop.getLng()));
        }
        return waypoints;
    }

    private AggregatedItemInfo aggregateItems(List<QuoteItem> items, com.freight.backend.entity.Quote entity) {
        AggregatedItemInfo info = new AggregatedItemInfo();

        if (items == null || items.isEmpty()) {
            // 아이템 없으면 엔티티 기본값 사용
            info.volumeCbm = entity.getVolumeCbm() != null ? entity.getVolumeCbm().doubleValue() : null;
            info.weightKg = entity.getWeightKg() != null ? entity.getWeightKg().doubleValue() : null;
            info.rotatable = true;
            info.stackable = true;
            info.fragile = false;
            info.noStack = false;
            info.bottomOnly = false;
            info.handling = List.of();
            return info;
        }

        double totalWeightKg = 0.0;
        double totalVolumeCbm = 0.0;
        Integer maxLength = null;
        Integer maxWidth = null;
        Integer maxHeight = null;
        boolean anyFragile = false;
        boolean anyNoStack = false;
        boolean anyBottomOnly = false;
        boolean allRotatable = true;
        boolean allStackable = true;
        Double minMaxStackWeight = null;
        Set<CargoHandling> handlingSet = new LinkedHashSet<>();

        for (QuoteItem item : items) {
            int quantity = item.getQuantity() == null || item.getQuantity() <= 0 ? 1 : item.getQuantity();

            if (item.getUnitWeightKg() != null && item.getUnitWeightKg() > 0) {
                totalWeightKg += item.getUnitWeightKg() * quantity;
            }

            double perUnitVolume = 0.0;
            if (item.getUnitVolumeCbm() != null && item.getUnitVolumeCbm() > 0) {
                perUnitVolume = item.getUnitVolumeCbm();
            } else if (hasDimensions(item)) {
                perUnitVolume = (item.getLengthCm() * item.getWidthCm() * item.getHeightCm()) / 1_000_000.0;
            }
            totalVolumeCbm += perUnitVolume * quantity;

            if (item.getLengthCm() != null && item.getLengthCm() > 0) {
                maxLength = maxInt(maxLength, item.getLengthCm());
            }
            if (item.getWidthCm() != null && item.getWidthCm() > 0) {
                maxWidth = maxInt(maxWidth, item.getWidthCm());
            }
            if (item.getHeightCm() != null && item.getHeightCm() > 0) {
                maxHeight = maxInt(maxHeight, item.getHeightCm());
            }

            anyFragile = anyFragile || Boolean.TRUE.equals(item.getFragile());
            anyNoStack = anyNoStack || Boolean.TRUE.equals(item.getNoStack());
            anyBottomOnly = anyBottomOnly || Boolean.TRUE.equals(item.getBottomOnly());
            allRotatable = allRotatable && !Boolean.FALSE.equals(item.getRotatable());
            allStackable = allStackable && !Boolean.FALSE.equals(item.getStackable());

            if (item.getMaxStackWeightKg() != null && item.getMaxStackWeightKg() > 0) {
                minMaxStackWeight = minPositive(minMaxStackWeight, item.getMaxStackWeightKg());
            }
            if (Boolean.TRUE.equals(item.getUpright())) {
                handlingSet.add(CargoHandling.UPRIGHT);
            }
            if (Boolean.TRUE.equals(item.getFragile())) {
                handlingSet.add(CargoHandling.FRAGILE);
            }
        }

        // 폴백: 엔티티 기본값
        if (totalWeightKg <= 0 && entity.getWeightKg() != null) {
            totalWeightKg = entity.getWeightKg().doubleValue();
        }
        if (totalVolumeCbm <= 0 && entity.getVolumeCbm() != null) {
            totalVolumeCbm = entity.getVolumeCbm().doubleValue();
        }

        boolean effectiveNoStack = anyNoStack || !allStackable;

        info.volumeCbm = totalVolumeCbm > 0 ? totalVolumeCbm : null;
        info.weightKg = totalWeightKg > 0 ? totalWeightKg : null;
        info.lengthCm = maxLength;
        info.widthCm = maxWidth;
        info.heightCm = maxHeight;
        info.rotatable = allRotatable;
        info.stackable = !effectiveNoStack;
        info.fragile = anyFragile;
        info.noStack = effectiveNoStack;
        info.bottomOnly = anyBottomOnly;
        info.maxStackWeight = minMaxStackWeight;
        info.handling = new ArrayList<>(handlingSet);
        return info;
    }

    private boolean hasDimensions(QuoteItem item) {
        return item.getLengthCm() != null && item.getLengthCm() > 0
                && item.getWidthCm() != null && item.getWidthCm() > 0
                && item.getHeightCm() != null && item.getHeightCm() > 0;
    }

    private Integer maxInt(Integer a, Integer b) {
        if (a == null) return b;
        if (b == null) return a;
        return Math.max(a, b);
    }

    private Double minPositive(Double a, Double b) {
        if (a == null || a <= 0) return b;
        if (b == null || b <= 0) return a;
        return Math.min(a, b);
    }

    private static class AggregatedItemInfo {
        Double volumeCbm;
        Double weightKg;
        Integer lengthCm;
        Integer widthCm;
        Integer heightCm;
        boolean rotatable;
        boolean stackable;
        boolean fragile;
        boolean noStack;
        boolean bottomOnly;
        Double maxStackWeight;
        List<CargoHandling> handling;
    }
}
