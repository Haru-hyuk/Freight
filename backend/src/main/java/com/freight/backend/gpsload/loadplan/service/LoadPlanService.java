package com.freight.backend.gpsload.loadplan.service;

import com.freight.backend.gpsload.loadplan.entity.LoadPlan;
import com.freight.backend.gpsload.loadplan.entity.LoadPlanItem;
import com.freight.backend.gpsload.loadplan.entity.TruckDimension;
import com.freight.backend.gpsload.loadplan.model.CargoItem;
import com.freight.backend.gpsload.loadplan.model.LoadPlanRequest;
import com.freight.backend.gpsload.loadplan.model.LoadPlanResponse;
import com.freight.backend.gpsload.loadplan.model.LoadPlanSavedResponse;
import com.freight.backend.gpsload.loadplan.model.Placement;
import com.freight.backend.gpsload.loadplan.model.Stats;
import com.freight.backend.gpsload.loadplan.model.Truck;
import com.freight.backend.gpsload.loadplan.repository.LoadPlanRepository;
import com.freight.backend.gpsload.loadplan.repository.TruckDimensionRepository;
import com.freight.backend.gpsload.loadplan.service.ExtremePointsGenerator.PlacedBox;
import com.freight.backend.gpsload.loadplan.service.ExtremePointsGenerator.Position;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Optional;

/**
 * 3D 빈 패킹 서비스 (Extreme Points + MaxRects + Best-Fit Decreasing)
 * 프론트엔드 route-assembly-test.html의 binPacking3D 함수를 Java로 포팅
 */
@Service
public class LoadPlanService {

    private static final int PADDING = 3; // 화물 간 여유 공간 (cm)
    private static final double LIGHT_GRAVITY_SUPPORT_RATIO = 0.65;
    private static final double MEDIUM_GRAVITY_SUPPORT_RATIO = 0.75;
    private static final double HEAVY_GRAVITY_SUPPORT_RATIO = 0.85;
    private static final double CENTER_STABILITY_CHECK_WEIGHT_KG = 50.0;
    private static final double CENTER_OFFSET_TOLERANCE_RATIO = 0.30;
    private static final double DEFAULT_MAX_STACK_WEIGHT = 200.0; // 기본 최대 적재 무게 (kg)

    private final LoadPlanRepository loadPlanRepository;
    private final TruckDimensionRepository truckDimensionRepository;

    public LoadPlanService(LoadPlanRepository loadPlanRepository,
                           TruckDimensionRepository truckDimensionRepository) {
        this.loadPlanRepository = loadPlanRepository;
        this.truckDimensionRepository = truckDimensionRepository;
    }

    /**
     * 3D 빈 패킹 알고리즘 실행
     */
    // 트럭/화물 입력을 받아 3D 적재 결과(배치 성공/실패/통계)를 계산한다.
    public LoadPlanResponse plan(LoadPlanRequest request) {
        Truck truck = mergeTruckDimensions(request.truck());
        List<CargoItem> items = request.items();

        int truckL = truck.length();
        int truckW = truck.width();
        int truckH = truck.height();

        // 차량 형식별 적재 특성 조회
        String loadingCharacteristic = getLoadingCharacteristic(truck.truckId());

        List<Placement> placements = new ArrayList<>();
        List<PlacedBox> placedBoxes = new ArrayList<>();
        List<CargoItem> unplaced = new ArrayList<>();
        MaxRects3D maxRects = new MaxRects3D(truckL, truckW, truckH);

        double totalWeight = 0.0;
        int violations = 0;
        int totalCount = items.size();

        // 정렬: LIFO 기반 - 마지막 하차할 화물을 먼저 배치해 안쪽에 위치
        List<CargoWithIndex> sortedCargos = new ArrayList<>();
        for (int i = 0; i < items.size(); i++) {
            sortedCargos.add(new CargoWithIndex(items.get(i), i));
        }

        sortedCargos.sort(Comparator
                // 1. 하차 순서: stopOrder 역순 (마지막 하차 먼저 배치 → 안쪽)
                .comparingInt((CargoWithIndex c) -> -stopOrder(c.item))
                // 2. 바닥 제약/적재 불가 화물 우선 배치
                .thenComparing((CargoWithIndex c) -> !bottomOnly(c.item))
                .thenComparing((CargoWithIndex c) -> !noStack(c.item))
                // 3. EASY_BREAK > FRAGILE 순으로 우선 배치 (위에 쌓을 수 없으므로)
                .thenComparing((CargoWithIndex c) -> !easyBreak(c.item))
                .thenComparing((CargoWithIndex c) -> !fragile(c.item))
                // 4. 무거운 화물 우선
                .thenComparingDouble((CargoWithIndex c) -> -c.item.weight())
                // 5. 밑면적: 크기가 큰 화물을 먼저
                .thenComparingLong(c -> -((long) c.item.length() * c.item.width()))
                // 6. 낮은 화물 우선
                .thenComparingInt(c -> c.item.height()));

        for (int idx = 0; idx < sortedCargos.size(); idx++) {
            CargoWithIndex cargoWithIndex = sortedCargos.get(idx);
            CargoItem cargo = cargoWithIndex.item;
            int originalIdx = cargoWithIndex.originalIndex;

            int unloadOrder = totalCount - originalIdx;

            // 회전 옵션 (차량 바디 타입별 정책 반영)
            List<Rotation> rotations = generateRotations(cargo, loadingCharacteristic);

            Position bestPosition = null;
            Rotation bestRotation = null;
            double bestScore = Double.MAX_VALUE;

            // 후보 위치 생성 (EP + Legacy 하이브리드)
            List<Position> candidates = ExtremePointsGenerator.generateCandidatePositions(
                    placedBoxes, truckL, truckW, truckH, PADDING);

            // 각 후보 위치에서 각 회전으로 배치 시도
            for (Position pos : candidates) {
                for (Rotation rot : rotations) {
                    // 배치 가능 여부 검사
                    if (!canPlace(pos.x, pos.y, pos.z, rot.l, rot.w, rot.h,
                            placedBoxes, truckL, truckW, truckH, cargo)) {
                        continue;
                    }

                    // LIFO 탈출 경로 검사
                    if (isBlockedFromDoor(
                            pos.x, pos.y, pos.z, rot.w, rot.h, rot.l,
                            placedBoxes, truck.doorPosition(), truckW, truckH, truckL
                    )) {
                        violations++;
                        continue;
                    }

                    // 중량 검사
                    if (totalWeight + cargo.weight() > truck.maxWeight()) {
                        continue;
                    }

                    // Best-Fit 점수 계산 (차량 형식 특성 반영)
                    double score = calculateBestFitScore(
                            pos.x, pos.y, pos.z, rot.w, rot.h, rot.l,
                            maxRects, placedBoxes, truckL, truckW, truckH,
                            unloadOrder, totalCount, cargo, truck.doorPosition(), loadingCharacteristic);

                    if (score < bestScore) {
                        bestScore = score;
                        bestPosition = pos;
                        bestRotation = rot;
                    }
                }
            }

            if (bestPosition != null && bestRotation != null) {
                // 배치 성공
                Placement placement = new Placement(
                        cargo.id(),
                        bestPosition.x,
                        bestPosition.y,
                        bestPosition.z,
                        bestRotation.l,
                        bestRotation.w,
                        bestRotation.h,
                        cargo.weight(),
                        stopOrder(cargo),
                        stackable(cargo),
                        new int[]{bestRotation.l, bestRotation.w, bestRotation.h},
                        fragile(cargo),
                        noStack(cargo),
                        bottomOnly(cargo),
                        cargo.maxStackWeight()
                );
                placements.add(placement);
                totalWeight += cargo.weight();

                // PlacedBox 추가
                placedBoxes.add(new PlacedBox(
                        bestPosition.x, bestPosition.y, bestPosition.z,
                        bestRotation.w, bestRotation.h, bestRotation.l,
                        cargo.weight(),
                        fragile(cargo),
                        easyBreak(cargo),
                        noStack(cargo),
                        bottomOnly(cargo),
                        cargo.maxStackWeight()));

                // MaxRects 업데이트
                maxRects.placeBox(
                        bestPosition.x, bestPosition.y, bestPosition.z,
                        bestRotation.w, bestRotation.h, bestRotation.l);
            } else {
                // 배치 실패 (오버플로우)
                unplaced.add(cargo);
            }
        }

        // 통계 계산
        long usedVolume = placements.stream()
                .mapToLong(p -> (long) p.length() * p.width() * p.height())
                .sum();
        long totalVolume = (long) truckL * truckW * truckH;
        double utilization = totalVolume > 0 ? (double) usedVolume / totalVolume : 0.0;

        Stats stats = new Stats(utilization, totalWeight, placements.size(), unplaced.size(), violations);
        return new LoadPlanResponse(placements, unplaced, stats);
    }

    /**
     * 배치 가능 여부 검사
     */
    // 특정 좌표/회전으로 화물을 놓을 수 있는지 제약조건을 순서대로 검증한다.
    private boolean canPlace(int x, int y, int z, int l, int w, int h,
                             List<PlacedBox> placedBoxes, int truckL, int truckW, int truckH,
                             CargoItem cargo) {
        // 트럭 범위 초과 검사
        if (x + w > truckW || y + h > truckH || z + l > truckL) return false;
        if (x < 0 || y < 0 || z < 0) return false;

        // bottomOnly 검사
        if (bottomOnly(cargo) && y != 0) return false;

        // 다른 박스와 충돌 검사
        for (PlacedBox box : placedBoxes) {
            if (boxesOverlap(x, y, z, w, h, l, box.x, box.y, box.z, box.w, box.h, box.l)) {
                return false;
            }
        }

        // 중력 지지 검사 (무게별 차등 지지율 + 중심 안정성)
        if (!checkGravitySupport(x, y, z, w, l, cargo.weight(), placedBoxes)) {
            return false;
        }

        // 적재 가능 무게 검사
        if (!checkStackability(x, y, z, w, l, cargo.weight(), placedBoxes)) {
            return false;
        }

        return true;
    }

    /**
     * 두 박스 충돌 여부 (AABB)
     */
    private boolean boxesOverlap(int x1, int y1, int z1, int w1, int h1, int l1,
                                  int x2, int y2, int z2, int w2, int h2, int l2) {
        return !(x1 + w1 <= x2 || x2 + w2 <= x1 ||
                 y1 + h1 <= y2 || y2 + h2 <= y1 ||
                 z1 + l1 <= z2 || z2 + l2 <= z1);
    }

    /**
     * 3D 중력 지지 검사 (3축 모두 고려):
     * 1) 무게 구간별 최소 지지율 적용 (X-Z 평면)
     * 2) 50kg 이상은 지지 중심이 화물 중심의 30% 이내인지 추가 검사
     * 3) Y축 안정성: 다단 적재 시 높이별 누적 하중 분포 검사
     * 4) 높은 위치일수록 더 엄격한 지지 요구
     */
    // 무게 구간별 지지율 + 중심 안정성(중량 화물) + Y축 높이 안정성을 검사한다.
    private boolean checkGravitySupport(
            int x, int y, int z, int w, int l, double weightKg, List<PlacedBox> placedBoxes
    ) {
        if (y == 0) return true;

        long boxArea = (long) w * l;
        long supportedArea = 0;
        double supportCentroidXSum = 0.0;
        double supportCentroidZSum = 0.0;

        int supportBoxCount = 0;

        for (PlacedBox box : placedBoxes) {
            if (Math.abs(box.y + box.h - y) > 1) continue;

            int overlapX = Math.max(0, Math.min(x + w, box.x + box.w) - Math.max(x, box.x));
            int overlapZ = Math.max(0, Math.min(z + l, box.z + box.l) - Math.max(z, box.z));
            long area = (long) overlapX * overlapZ;
            if (area <= 0) continue;

            supportedArea += area;
            supportBoxCount++;

            double overlapStartX = Math.max(x, box.x);
            double overlapStartZ = Math.max(z, box.z);
            double overlapCenterX = overlapStartX + (overlapX / 2.0);
            double overlapCenterZ = overlapStartZ + (overlapZ / 2.0);
            supportCentroidXSum += overlapCenterX * area;
            supportCentroidZSum += overlapCenterZ * area;
        }

        // Y축 높이 안정성: 높은 위치일수록 더 넓은 지지 필요
        double heightFactor = 1.0 + (y / 200.0) * 0.1; // 200cm마다 10% 더 엄격
        double requiredRatioBase = requiredSupportRatio(weightKg);
        double adjustedRequiredRatio = Math.min(0.95, requiredRatioBase * heightFactor);

        double supportRatio = boxArea > 0 ? ((double) supportedArea / boxArea) : 0.0;
        if (supportRatio < adjustedRequiredRatio) {
            return false;
        }

        // 3축 중심 안정성 검사 (중량 화물)
        if (weightKg >= CENTER_STABILITY_CHECK_WEIGHT_KG && supportedArea > 0) {
            double supportCx = supportCentroidXSum / supportedArea;
            double supportCz = supportCentroidZSum / supportedArea;

            double cargoCx = x + (w / 2.0);
            double cargoCz = z + (l / 2.0);

            // X-Z 평면 중심 편차
            double maxOffsetX = w * CENTER_OFFSET_TOLERANCE_RATIO;
            double maxOffsetZ = l * CENTER_OFFSET_TOLERANCE_RATIO;

            if (Math.abs(supportCx - cargoCx) > maxOffsetX) {
                return false;
            }
            if (Math.abs(supportCz - cargoCz) > maxOffsetZ) {
                return false;
            }

            // Y축 안정성: 다단 적재 시 너무 높은 곳에 무거운 화물은 위험
            // 100kg 이상 화물이 높이 150cm 이상에 배치되면 추가 검사
            if (weightKg >= 100.0 && y > 150) {
                // 지지 박스가 최소 2개 이상이어야 함
                if (supportBoxCount < 2) {
                    return false;
                }
                // 지지율 80% 이상 필요
                if (supportRatio < 0.80) {
                    return false;
                }
            }
        }

        return true;
    }

    private double requiredSupportRatio(double weightKg) {
        if (weightKg < 30.0) {
            return LIGHT_GRAVITY_SUPPORT_RATIO;
        }
        if (weightKg < 100.0) {
            return MEDIUM_GRAVITY_SUPPORT_RATIO;
        }
        return HEAVY_GRAVITY_SUPPORT_RATIO;
    }

    /**
     * 적재 가능 무게 검사: noStack/easyBreak/fragile/maxStackWeight 반영
     * - EASY_BREAK(충격주의): 절대 적재 금지 (충격이 전달되어 파손 위험)
     * - FRAGILE(파손주의): maxStackWeight 설정 시 해당 무게까지 허용
     */
    // noStack/easyBreak/fragile/maxStackWeight 제약으로 상부 적재 가능 여부를 검사한다.
    private boolean checkStackability(int x, int y, int z, int w, int l, double weightKg,
                                       List<PlacedBox> placedBoxes) {
        if (y == 0) return true;

        for (PlacedBox box : placedBoxes) {
            if (Math.abs(box.y + box.h - y) > 1) continue;

            int overlapX = Math.max(0, Math.min(x + w, box.x + box.w) - Math.max(x, box.x));
            int overlapZ = Math.max(0, Math.min(z + l, box.z + box.l) - Math.max(z, box.z));

            if (overlapX > 0 && overlapZ > 0) {
                // noStack 박스 위에는 쌓을 수 없음
                if (box.noStack) return false;

                // EASY_BREAK (충격주의): 절대 적재 금지
                // 충격이 전달되어 파손 위험이 있으므로 maxStackWeight 설정과 무관하게 금지
                if (box.easyBreak) {
                    return false;
                }

                // FRAGILE (파손주의): 제한적 적재 허용
                // maxStackWeight가 명시적으로 설정된 경우에만 그 무게까지 허용
                if (box.fragile) {
                    if (box.maxStackWeight == null || box.maxStackWeight <= 0) {
                        return false; // fragile 화물 위 기본적으로 적재 금지
                    }
                    // maxStackWeight가 설정된 경우 해당 무게까지만 허용
                    double totalWeightOnBox = calcWeightOnBox(box, placedBoxes) + weightKg;
                    if (totalWeightOnBox > box.maxStackWeight) return false;
                    continue;
                }

                // 일반 화물: 최대 적재 무게 검사
                double totalWeightOnBox = calcWeightOnBox(box, placedBoxes) + weightKg;
                double boxMaxLoad = Math.min(DEFAULT_MAX_STACK_WEIGHT, box.weightKg * 2);
                if (box.maxStackWeight != null && box.maxStackWeight > 0) {
                    boxMaxLoad = box.maxStackWeight;
                }

                if (totalWeightOnBox > boxMaxLoad) return false;
            }
        }
        return true;
    }

    /**
     * 특정 박스 위에 쌓인 총 무게 계산
     */
    private double calcWeightOnBox(PlacedBox targetBox, List<PlacedBox> placedBoxes) {
        double totalWeight = 0;

        for (PlacedBox box : placedBoxes) {
            // targetBox 위에 있는 박스 찾기
            if (box.y <= targetBox.y + targetBox.h) continue;

            // x-z 평면에서 겹치는지 확인
            int overlapX = Math.max(0,
                    Math.min(targetBox.x + targetBox.w, box.x + box.w) -
                    Math.max(targetBox.x, box.x));
            int overlapZ = Math.max(0,
                    Math.min(targetBox.z + targetBox.l, box.z + box.l) -
                    Math.max(targetBox.z, box.z));

            if (overlapX > 0 && overlapZ > 0) {
                // 겹치는 비율만큼 무게 분산
                double overlapRatio = (double) (overlapX * overlapZ) / (box.w * box.l);
                totalWeight += box.weightKg * overlapRatio;
            }
        }

        return totalWeight;
    }

    /**
     * LIFO 탈출 경로 검사: 문(z=0) 방향으로 막히면 true 반환
     */
    private boolean isBlockedFromDoor(
            int x, int y, int z, int w, int h, int l,
            List<PlacedBox> placedBoxes,
            String doorPosition,
            int truckW,
            int truckH,
            int truckL
    ) {
        String door = doorPosition == null ? "rear" : doorPosition.toLowerCase();
        return switch (door) {
            case "left" -> isBlockedFromLeftDoor(x, y, z, w, h, l, placedBoxes);
            case "right" -> isBlockedFromRightDoor(x, y, z, w, h, l, placedBoxes, truckW);
            case "top" -> isBlockedFromTopDoor(x, y, z, w, h, l, placedBoxes, truckH);
            case "side", "side_both" -> {
                boolean leftBlocked = isBlockedFromLeftDoor(x, y, z, w, h, l, placedBoxes);
                boolean rightBlocked = isBlockedFromRightDoor(x, y, z, w, h, l, placedBoxes, truckW);
                yield leftBlocked && rightBlocked;
            }
            default -> isBlockedFromRearDoor(x, y, z, w, h, l, placedBoxes, truckL);
        };
    }

    private boolean isBlockedFromRearDoor(int x, int y, int z, int w, int h, int l,
                                          List<PlacedBox> placedBoxes, int truckL) {
        if (z <= 0) return false;
        for (PlacedBox box : placedBoxes) {
            boolean xOverlap = overlaps(x, x + w, box.x, box.x + box.w);
            boolean yOverlap = overlaps(y, y + h, box.y, box.y + box.h);
            boolean doorCorridorZ = box.z < z && box.z + box.l > 0 && box.z < truckL;
            if (xOverlap && yOverlap && doorCorridorZ) return true;
        }
        return false;
    }

    private boolean isBlockedFromLeftDoor(int x, int y, int z, int w, int h, int l,
                                          List<PlacedBox> placedBoxes) {
        if (x <= 0) return false;
        for (PlacedBox box : placedBoxes) {
            boolean yOverlap = overlaps(y, y + h, box.y, box.y + box.h);
            boolean zOverlap = overlaps(z, z + l, box.z, box.z + box.l);
            boolean doorCorridorX = box.x < x && box.x + box.w > 0;
            if (yOverlap && zOverlap && doorCorridorX) return true;
        }
        return false;
    }

    private boolean isBlockedFromRightDoor(int x, int y, int z, int w, int h, int l,
                                           List<PlacedBox> placedBoxes, int truckW) {
        if (x + w >= truckW) return false;
        for (PlacedBox box : placedBoxes) {
            boolean yOverlap = overlaps(y, y + h, box.y, box.y + box.h);
            boolean zOverlap = overlaps(z, z + l, box.z, box.z + box.l);
            boolean doorCorridorX = box.x < truckW && box.x + box.w > x + w;
            if (yOverlap && zOverlap && doorCorridorX) return true;
        }
        return false;
    }

    private boolean isBlockedFromTopDoor(int x, int y, int z, int w, int h, int l,
                                         List<PlacedBox> placedBoxes, int truckH) {
        if (y + h >= truckH) return false;
        for (PlacedBox box : placedBoxes) {
            boolean xOverlap = overlaps(x, x + w, box.x, box.x + box.w);
            boolean zOverlap = overlaps(z, z + l, box.z, box.z + box.l);
            boolean doorCorridorY = box.y < truckH && box.y + box.h > y + h;
            if (xOverlap && zOverlap && doorCorridorY) return true;
        }
        return false;
    }

    private boolean overlaps(int aStart, int aEnd, int bStart, int bEnd) {
        return !(aEnd <= bStart || bEnd <= aStart);
    }

    /**
     * Best-Fit 점수 계산: 낮을수록 좋음 (LIFO 우선, 밀착도 보너스, 공간효율 보너스)
     * EASY_BREAK(충격주의) 화물은 벽면 밀착 가중치 2배 적용
     * 문 위치에 따라 LIFO 축이 달라짐:
     * - rear: z축 기준 (뒤쪽부터 채움)
     * - left: x축 기준 (왼쪽 가까이)
     * - right: x축 기준 (오른쪽 가까이)
     * - top: y축 기준 (바닥부터)
     * - side_both: x축 양쪽 모두 접근 가능
     */
    // 점수는 작을수록 좋다: 하차 접근성(LIFO) + 접촉 안정성 + 잔여공간 효율을 함께 반영.
    private double calculateBestFitScore(int x, int y, int z, int w, int h, int l,
                                          MaxRects3D maxRects, List<PlacedBox> placedBoxes,
                                          int truckL, int truckW, int truckH,
                                          int unloadOrder, int totalCount,
                                          CargoItem cargo, String doorPosition, String loadingCharacteristic) {
        // 1. 문 위치에 따른 LIFO 축 설정 + 높이 최소화(바닥 배치 선호)
        // EASY_BREAK는 절대 위에 쌓을 수 없으므로 높은 패널티
        double baseHeightPenalty;
        if (easyBreak(cargo)) {
            baseHeightPenalty = 8000.0; // 충격주의: 바닥 배치 강제
        } else if (noStack(cargo) || fragile(cargo) || bottomOnly(cargo)) {
            baseHeightPenalty = 5000.0;
        } else if (stackable(cargo)) {
            baseHeightPenalty = 1500.0;
        } else {
            baseHeightPenalty = 2500.0;
        }
        // 차량 형식에 따른 높이 패널티 조정
        double heightPenaltyMultiplier = adjustHeightPenaltyForBodyType(baseHeightPenalty, loadingCharacteristic);

        String door = doorPosition == null ? "rear" : doorPosition.toLowerCase();
        double lifoScore;

        switch (door) {
            case "left":
                // 왼쪽 문: x값이 작을수록 문에 가까움 → 먼저 하차할 화물은 x 최소
                // LIFO: 나중 하차 화물은 x가 커야 함 (안쪽) → x를 최소화하면 문 가까이
                lifoScore = x * 100000.0 + y * heightPenaltyMultiplier + z;
                break;
            case "right":
                // 오른쪽 문: x+w가 truckW에 가까울수록 문에 가까움
                // 먼저 하차할 화물은 오른쪽에, 나중 하차 화물은 왼쪽에
                lifoScore = -(x + w) * 100000.0 + y * heightPenaltyMultiplier + z;
                break;
            case "top":
                // 상단 문: y값이 클수록 문에 가까움 (크레인 하역)
                // 먼저 하차할 화물은 위에, 나중 하차 화물은 아래에
                lifoScore = -(y + h) * 100000.0 + z * 1000.0 + x;
                break;
            case "side", "side_both":
                // 양쪽 측면 문 (윙바디): 중앙에 배치하여 양쪽 접근 용이
                // 먼저 하차할 화물은 측면에, 나중 하차는 중앙에
                double centerX = truckW / 2.0;
                double distFromCenter = Math.abs((x + w / 2.0) - centerX);
                lifoScore = -distFromCenter * 100000.0 + y * heightPenaltyMultiplier - z * 500.0;
                break;
            default: // "rear"
                // 뒤쪽 문: z값이 작을수록 문에 가까움 (기존 로직)
                // 먼저 하차할 화물은 z 최소, 나중 하차 화물은 z 최대 (안쪽)
                lifoScore = -z * 100000.0 + y * heightPenaltyMultiplier + x;
                break;
        }

        // 벽면 밀착 가중치 차등 적용:
        // - EASY_BREAK(충격주의): 벽 밀착 회피 (충격 전달 위험) → 0.3배
        // - FRAGILE(파손주의): 벽 밀착 선호 (안정성) → 2.0배
        // - 일반 화물: 1.0배
        double wallBonus;
        if (easyBreak(cargo)) {
            wallBonus = 0.3; // 충격 전달 방지를 위해 벽면 밀착 회피
        } else if (fragile(cargo)) {
            wallBonus = 2.0; // 안정성을 위해 벽면 밀착 선호
        } else {
            wallBonus = 1.0;
        }

        // 2. 밀착도 점수 (벽면/다른 박스에 붙을수록 좋음)
        // 문 위치에 따라 벽면 밀착 보너스 차등 적용
        double contactScore = 0;

        switch (door) {
            case "left":
                // 왼쪽 문: 오른쪽/뒤쪽/바닥 벽면 밀착 선호
                if (x + w >= truckW - 5) contactScore += w * h * 12.0 * wallBonus; // 오른쪽 벽
                if (y == 0) contactScore += w * l * 15.0 * wallBonus; // 바닥
                if (z == 0) contactScore += w * h * 10.0 * wallBonus; // 안쪽 벽
                break;
            case "right":
                // 오른쪽 문: 왼쪽/뒤쪽/바닥 벽면 밀착 선호
                if (x == 0) contactScore += w * h * 12.0 * wallBonus; // 왼쪽 벽
                if (y == 0) contactScore += w * l * 15.0 * wallBonus; // 바닥
                if (z == 0) contactScore += w * h * 10.0 * wallBonus; // 안쪽 벽
                break;
            case "top":
                // 상단 문: 양 측면/뒤쪽 벽면 밀착 선호, 바닥 보너스 높임
                if (x == 0) contactScore += w * h * 10.0 * wallBonus; // 왼쪽 벽
                if (x + w >= truckW - 5) contactScore += w * h * 10.0 * wallBonus; // 오른쪽 벽
                if (y == 0) contactScore += w * l * 20.0 * wallBonus; // 바닥 (상단 문이라 바닥 중요)
                if (z == 0) contactScore += w * h * 10.0 * wallBonus; // 안쪽 벽
                break;
            case "side", "side_both":
                // 윙바디: 앞뒤/바닥 벽면 밀착 선호 (측면은 문이므로)
                if (y == 0) contactScore += w * l * 18.0 * wallBonus; // 바닥
                if (z == 0) contactScore += w * h * 12.0 * wallBonus; // 안쪽 벽 (앞쪽)
                if (z + l >= truckL - 5) contactScore += w * h * 8.0 * wallBonus; // 뒤쪽 벽
                break;
            default: // "rear"
                // 뒤쪽 문: 양 측면/안쪽/바닥 벽면 밀착 선호
                if (x == 0) contactScore += w * h * 10.0 * wallBonus; // 왼쪽 벽
                if (y == 0) contactScore += w * l * 15.0 * wallBonus; // 바닥
                if (z == 0) contactScore += w * h * 10.0 * wallBonus; // 안쪽 벽
                break;
        }

        // 다른 박스와 접촉
        for (PlacedBox box : placedBoxes) {
            // 오른쪽 면 접촉
            if (Math.abs(x - (box.x + box.w)) < 5) {
                int overlapY = Math.max(0, Math.min(y + h, box.y + box.h) - Math.max(y, box.y));
                int overlapZ = Math.max(0, Math.min(z + l, box.z + box.l) - Math.max(z, box.z));
                contactScore += overlapY * overlapZ * 5.0;
            }
            // 위쪽 면 접촉
            if (Math.abs(y - (box.y + box.h)) < 2) {
                int overlapX = Math.max(0, Math.min(x + w, box.x + box.w) - Math.max(x, box.x));
                int overlapZ = Math.max(0, Math.min(z + l, box.z + box.l) - Math.max(z, box.z));
                contactScore += overlapX * overlapZ * 8.0;
            }
            // 앞쪽 면 접촉
            if (Math.abs(z - (box.z + box.l)) < 5) {
                int overlapX = Math.max(0, Math.min(x + w, box.x + box.w) - Math.max(x, box.x));
                int overlapY = Math.max(0, Math.min(y + h, box.y + box.h) - Math.max(y, box.y));
                contactScore += overlapX * overlapY * 5.0;
            }
        }

        // 3. 공간 효율 점수 (남는 공간을 적게 만드는 위치)
        double spaceWasteScore = 0;
        for (MaxRects3D.FreeBox free : maxRects.getFreeBoxes()) {
            if (x >= free.x && x + w <= free.x + free.w &&
                y >= free.y && y + h <= free.y + free.h &&
                z >= free.z && z + l <= free.z + free.l) {
                // 완벽하게 맞으면 보너스
                if (w == free.w) spaceWasteScore += 1000;
                if (l == free.l) spaceWasteScore += 1000;
                if (h == free.h) spaceWasteScore += 500;
            }
        }

        // 최종 점수: 낮을수록 좋음
        return lifoScore - contactScore * 10 - spaceWasteScore;
    }

    /**
     * 회전 옵션 생성 (차량 바디 타입별 정책 반영)
     * - HEIGHT_LIMITED(탑차): 높이 증가 회전 금지
     * - SIDE_LOADING(윙바디): 측면 적재를 고려해 제한적 높이축 회전 허용
     * - TOP_LOADING(평판): 상단 적재로 6방향 회전 허용
     * - STANDARD(카고): 기본 2방향 + 조건부 높이축 회전
     */
    private List<Rotation> generateRotations(CargoItem item, String loadingCharacteristic) {
        List<Rotation> rotations = new ArrayList<>();

        int l = item.length();
        int w = item.width();
        int h = item.height();

        // UPRIGHT(세워서 적재) 또는 회전 불가 화물은 원본 고정
        if (!rotatable(item) || item.isUprightFromHandling()) {
            rotations.add(new Rotation(l, w, h, 0));
            return rotations;
        }

        String characteristic = loadingCharacteristic == null ? "STANDARD" : loadingCharacteristic.trim().toUpperCase();
        boolean topLoading = "TOP_LOADING".equals(characteristic);
        boolean sideLoading = "SIDE_LOADING".equals(characteristic);
        boolean heightLimited = "HEIGHT_LIMITED".equals(characteristic);

        // 공통: 바닥면 회전(높이 고정)
        addRotation(rotations, l, w, h, 0);
        addRotation(rotations, w, l, h, 1);

        // 차체 타입별 높이축 회전 정책
        if (topLoading) {
            // 평판: 상단 접근 가능하므로 전 방향 회전 허용
            addRotation(rotations, l, h, w, 2);
            addRotation(rotations, h, l, w, 3);
            addRotation(rotations, w, h, l, 4);
            addRotation(rotations, h, w, l, 5);
        } else if (sideLoading) {
            // 윙바디: 측면 도어 기반으로 제한적 높이축 회전만 허용
            if (h < l || h < w) {
                addRotation(rotations, h, w, l, 2);
                addRotation(rotations, l, h, w, 3);
            }
        } else if (!heightLimited) {
            // 카고/일반: 기존 전략 유지(조건부 높이축 회전)
            if (h < l && h < w) {
                addRotation(rotations, h, w, l, 2);
                addRotation(rotations, w, h, l, 3);
            } else if (h > l || h > w) {
                if (h > l) {
                    addRotation(rotations, h, w, l, 2);
                }
                if (h > w) {
                    addRotation(rotations, l, h, w, 3);
                }
            }
        }

        // 탑차(HEIGHT_LIMITED): 원본 높이보다 높아지는 회전은 제외
        if (heightLimited) {
            rotations = rotations.stream()
                    .filter(r -> r.h <= h)
                    .collect(java.util.stream.Collectors.toCollection(ArrayList::new));
        }

        if (rotations.isEmpty()) {
            rotations.add(new Rotation(l, w, h, 0));
        }
        return rotations;
    }

    private void addRotation(List<Rotation> rotations, int l, int w, int h, int type) {
        boolean exists = rotations.stream().anyMatch(r -> r.l() == l && r.w() == w && r.h() == h);
        if (!exists) {
            rotations.add(new Rotation(l, w, h, type));
        }
    }

    // ========================================
    // 적재 계획 저장
    // ========================================

    public LoadPlanSavedResponse planAndSave(LoadPlanRequest request) {
        LoadPlanResponse result = plan(request);
        Truck truck = mergeTruckDimensions(request.truck());

        LoadPlan plan = new LoadPlan(
                truck.truckId(),
                result.stats().utilization(),
                result.stats().totalWeight(),
                result.stats().placedCount(),
                result.stats().unplacedCount(),
                result.stats().violations(),
                LocalDateTime.now()
        );

        // Save placed items
        for (Placement p : result.placements()) {
            LoadPlanItem item = new LoadPlanItem(
                    p.id(),
                    p.length(),
                    p.width(),
                    p.height(),
                    p.weight(),
                    p.stopOrder(),
                    true,
                    p.stackable(),
                    true,
                    p.x(),
                    p.y(),
                    p.z(),
                    p.orientation()[0],
                    p.orientation()[1],
                    p.orientation()[2]
            );
            plan.addItem(item);
        }

        // Save unplaced items
        for (CargoItem item : result.unplaced()) {
            LoadPlanItem unplacedItem = new LoadPlanItem(
                    item.id(),
                    item.length(),
                    item.width(),
                    item.height(),
                    item.weight(),
                    stopOrder(item),
                    rotatable(item),
                    stackable(item),
                    false,
                    null,
                    null,
                    null,
                    null,
                    null,
                    null
            );
            plan.addItem(unplacedItem);
        }

        LoadPlan saved = loadPlanRepository.save(plan);
        return new LoadPlanSavedResponse(saved.getPlanId(), result);
    }

    // ========================================
    // 헬퍼 메서드들
    // ========================================

    /**
     * truckId로 trucks 테이블 조회하여 치수 병합.
     * door_position: trucks에 없으므로 vehicle_body_type 보정 (cargo→rear, wingbody→side, top→rear).
     * max_weight: trucks.max_weight 사용 (요청 값보다 DB 값 우선).
     */
    private Truck mergeTruckDimensions(Truck truck) {
        if (truck.truckId() == null) {
            return truck;
        }
        TruckDimension d = truckDimensionRepository.findById(truck.truckId()).orElse(null);
        if (d == null) {
            return truck;
        }
        // trucks 테이블의 cargo_length/width/height가 null이면 요청 값 유지
        int length = d.getLength() != null ? d.getLength() : truck.length();
        int width = d.getWidth() != null ? d.getWidth() : truck.width();
        int height = d.getHeight() != null ? d.getHeight() : truck.height();
        double maxWeight = d.getMaxWeightKg() != null ? d.getMaxWeightKg() : truck.maxWeight();
        // door_position: trucks에 없으므로 vehicle_body_type으로 보정
        String doorPosition = d.getDoorPosition();
        if (doorPosition == null || doorPosition.isBlank()) {
            doorPosition = truck.doorPosition();
        }
        return new Truck(truck.truckId(), length, width, height, maxWeight, doorPosition);
    }

    /**
     * 차량 형식별 적재 특성 조회
     * @return STANDARD, SIDE_LOADING, TOP_LOADING, HEIGHT_LIMITED 중 하나
     */
    private String getLoadingCharacteristic(Long truckId) {
        if (truckId == null) {
            return "STANDARD";
        }
        return truckDimensionRepository.findById(truckId)
                .map(TruckDimension::getLoadingCharacteristic)
                .orElse("STANDARD");
    }

    /**
     * 차량 형식에 따른 높이 패널티 조정
     * - HEIGHT_LIMITED (탑차): 높이 활용 보너스 증가 (높이 제한 고려)
     * - TOP_LOADING (평판): 높이 패널티 감소 (위에서 적재)
     * - SIDE_LOADING (윙바디): 중앙 배치 보너스
     */
    private double adjustHeightPenaltyForBodyType(double basePenalty, String loadingCharacteristic) {
        return switch (loadingCharacteristic) {
            case "HEIGHT_LIMITED" -> basePenalty * 1.5; // 탑차: 높이 쌓기 페널티 증가
            case "TOP_LOADING" -> basePenalty * 0.7; // 평판: 높이 쌓기 페널티 감소
            case "SIDE_LOADING" -> basePenalty * 0.9; // 윙바디: 약간 감소
            default -> basePenalty;
        };
    }

    private int stopOrder(CargoItem item) {
        if (item.stopOrder() == null || item.stopOrder() < 1) {
            // 순서 미지정 화물은 맨 안쪽에 배치 (LIFO에서 마지막 하차)
            return 999;
        }
        return item.stopOrder();
    }

    private boolean rotatable(CargoItem item) {
        return item.rotatable() == null || item.rotatable();
    }

    private boolean stackable(CargoItem item) {
        return item.stackable() == null || item.stackable();
    }

    private boolean fragile(CargoItem item) {
        // FRAGILE(파손주의): 벽 밀착 선호, 제한적 상부 적재 허용
        return Boolean.TRUE.equals(item.fragile()) || item.isFragileFromHandling();
    }

    private boolean easyBreak(CargoItem item) {
        // EASY_BREAK(충격주의): 벽 밀착 회피, 상부 적재 절대 금지
        return item.isEasyBreakFromHandling();
    }

    private boolean noStack(CargoItem item) {
        // stackable=false는 noStack과 동일한 의미로 처리
        return Boolean.TRUE.equals(item.noStack()) || Boolean.FALSE.equals(item.stackable());
    }

    private boolean bottomOnly(CargoItem item) {
        return Boolean.TRUE.equals(item.bottomOnly());
    }

    // ========================================
    // 내부 클래스
    // ========================================

    private record CargoWithIndex(CargoItem item, int originalIndex) {}

    private record Rotation(int l, int w, int h, int rotationType) {}
}

