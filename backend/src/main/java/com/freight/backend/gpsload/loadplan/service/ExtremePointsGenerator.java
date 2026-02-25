package com.freight.backend.gpsload.loadplan.service;

import java.util.*;

/**
 * Extreme Points 알고리즘: 모든 가능한 배치점 계산
 * 참고: 프론트엔드 route-assembly-test.html의 generateExtremePoints 함수 Java 포팅
 */
public class ExtremePointsGenerator {

    private static final int MAX_CANDIDATES_MIN = 200;
    private static final int MAX_CANDIDATES_DEFAULT = 300;
    private static final int MAX_CANDIDATES_LARGE = 500;
    private static final int MAX_CANDIDATES_MAX = 800;

    /**
     * 배치된 박스들과 트럭 크기를 기반으로 후보 배치점 생성
     * EP + Legacy 하이브리드 방식
     */
    public static List<Position> generateCandidatePositions(
            List<PlacedBox> placedBoxes, int truckL, int truckW, int truckH, int padding) {
        // 동적 제한 계산: 트럭 크기 + 배치된 박스 수 기반
        int maxCandidates = calculateDynamicMaxCandidates(placedBoxes.size(), truckL, truckW, truckH);
        return generateCandidatePositions(placedBoxes, truckL, truckW, truckH, padding, maxCandidates);
    }

    /**
     * 동적 MAX_CANDIDATES 계산
     * - 트럭이 클수록 더 많은 후보점 필요
     * - 이미 배치된 박스가 많을수록 더 정밀한 탐색 필요
     */
    private static int calculateDynamicMaxCandidates(int placedCount, int truckL, int truckW, int truckH) {
        // 트럭 부피 (m³)
        double truckVolumeCbm = (truckL * truckW * truckH) / 1_000_000.0;

        // 기본 제한: 트럭 크기에 비례
        int sizeBasedLimit;
        if (truckVolumeCbm < 10) {
            sizeBasedLimit = MAX_CANDIDATES_MIN;
        } else if (truckVolumeCbm < 25) {
            sizeBasedLimit = MAX_CANDIDATES_DEFAULT;
        } else if (truckVolumeCbm < 50) {
            sizeBasedLimit = MAX_CANDIDATES_LARGE;
        } else {
            sizeBasedLimit = MAX_CANDIDATES_MAX;
        }

        // 배치된 박스 수에 따른 조정: 많이 쌓일수록 더 정밀한 탐색
        int placedBonus = Math.min(200, placedCount * 10);

        return Math.min(MAX_CANDIDATES_MAX, sizeBasedLimit + placedBonus);
    }

    /**
     * 배치된 박스들과 트럭 크기를 기반으로 후보 배치점 생성 (제한값 지정)
     */
    public static List<Position> generateCandidatePositions(
            List<PlacedBox> placedBoxes, int truckL, int truckW, int truckH, int padding, int maxCandidates) {

        // 1. Extreme Points 알고리즘
        List<Position> epCandidates = generateExtremePoints(placedBoxes, truckL, truckW, truckH, padding);

        // 2. 레거시 알고리즘
        List<Position> legacyCandidates = generateLegacyCandidates(placedBoxes, truckL, truckW, truckH, padding);

        // 3. 결합 및 중복 제거
        Set<String> seen = new HashSet<>();
        List<Position> all = new ArrayList<>();

        for (Position c : epCandidates) {
            String key = c.x + "," + c.y + "," + c.z;
            if (seen.add(key)) {
                all.add(c);
            }
        }

        for (Position c : legacyCandidates) {
            String key = c.x + "," + c.y + "," + c.z;
            if (!seen.contains(key) && c.x >= 0 && c.y >= 0 && c.z >= 0 &&
                c.x < truckW && c.y < truckH && c.z < truckL) {
                // 배치된 박스 내부 체크
                boolean insideBox = false;
                for (PlacedBox box : placedBoxes) {
                    if (c.x >= box.x && c.x < box.x + box.w &&
                        c.y >= box.y && c.y < box.y + box.h &&
                        c.z >= box.z && c.z < box.z + box.l) {
                        insideBox = true;
                        break;
                    }
                }
                if (!insideBox) {
                    seen.add(key);
                    all.add(c);
                }
            }
        }

        // LIFO 우선순위: z(안쪽) → y(바닥) → x(왼쪽) 순으로 정렬
        all.sort((a, b) -> {
            if (a.z != b.z) return Integer.compare(a.z, b.z);
            if (a.y != b.y) return Integer.compare(a.y, b.y);
            return Integer.compare(a.x, b.x);
        });

        // 성능 최적화: 동적 제한 적용
        if (all.size() > maxCandidates) {
            return all.subList(0, maxCandidates);
        }
        return all;
    }

    /**
     * Extreme Points 생성
     */
    private static List<Position> generateExtremePoints(
            List<PlacedBox> placedBoxes, int truckL, int truckW, int truckH, int padding) {

        Set<String> eps = new HashSet<>();
        eps.add("0,0,0"); // 원점은 항상 후보

        // 각 배치된 박스의 모서리에서 극점 생성
        for (PlacedBox box : placedBoxes) {
            int px = box.x, py = box.y, pz = box.z;
            int ex = box.x + box.w + padding;
            int ey = box.y + box.h;
            int ez = box.z + box.l + padding;

            // 6개의 기본 Extreme Points (박스 표면에서 투영)
            // X+ 방향: 박스 오른쪽
            if (ex < truckW) {
                eps.add(ex + "," + py + "," + pz);
                eps.add(ex + ",0," + pz);
                eps.add(ex + "," + py + ",0");
                eps.add(ex + ",0,0");
            }
            // Y+ 방향: 박스 위쪽
            if (ey < truckH) {
                eps.add(px + "," + ey + "," + pz);
                eps.add("0," + ey + "," + pz);
                eps.add(px + "," + ey + ",0");
                eps.add("0," + ey + ",0");
            }
            // Z+ 방향: 박스 바깥쪽
            if (ez < truckL) {
                eps.add(px + "," + py + "," + ez);
                eps.add("0," + py + "," + ez);
                eps.add(px + ",0," + ez);
                eps.add("0,0," + ez);
            }

            // 대각선 코너 극점 (L자 공간 활용)
            if (ex < truckW && ez < truckL) eps.add(ex + "," + py + "," + ez);
            if (ex < truckW && ey < truckH) eps.add(ex + "," + ey + "," + pz);
            if (ey < truckH && ez < truckL) eps.add(px + "," + ey + "," + ez);
            if (ex < truckW && ey < truckH && ez < truckL) eps.add(ex + "," + ey + "," + ez);

            // 벽면 접합 극점 (빈틈 채우기)
            eps.add("0," + py + "," + pz);
            eps.add(px + ",0," + pz);
            eps.add(px + "," + py + ",0");
        }

        // 박스 간 투영 극점 (Gap Filling)
        for (int i = 0; i < placedBoxes.size(); i++) {
            PlacedBox boxA = placedBoxes.get(i);
            for (int j = i + 1; j < placedBoxes.size(); j++) {
                PlacedBox boxB = placedBoxes.get(j);

                // Z 방향 간격
                int maxZ = Math.max(boxA.z + boxA.l, boxB.z + boxB.l);
                int minZ = Math.min(boxA.z, boxB.z);
                if (maxZ - minZ > padding * 2) {
                    eps.add("0,0," + (maxZ + padding));
                    eps.add(boxA.x + "," + boxA.y + "," + (maxZ + padding));
                }

                // 같은 높이에서 빈 공간
                if (Math.abs(boxA.y - boxB.y) < 5) {
                    eps.add((boxA.x + boxA.w + padding) + "," + boxA.y + "," + boxB.z);
                    eps.add((boxB.x + boxB.w + padding) + "," + boxB.y + "," + boxA.z);
                }
            }
        }

        // 트럭 경계 극점 추가
        for (PlacedBox box : placedBoxes) {
            eps.add(box.x + "," + (box.y + box.h) + ",0");
            eps.add((box.x + box.w + padding) + "," + box.y + ",0");
        }

        // Set → List 변환 및 필터링
        List<Position> candidates = new ArrayList<>();
        for (String key : eps) {
            String[] parts = key.split(",");
            int x = Integer.parseInt(parts[0]);
            int y = Integer.parseInt(parts[1]);
            int z = Integer.parseInt(parts[2]);

            if (x >= 0 && y >= 0 && z >= 0 && x < truckW && y < truckH && z < truckL) {
                // 배치된 박스 내부인지 체크
                boolean insideBox = false;
                for (PlacedBox box : placedBoxes) {
                    if (x >= box.x && x < box.x + box.w &&
                        y >= box.y && y < box.y + box.h &&
                        z >= box.z && z < box.z + box.l) {
                        insideBox = true;
                        break;
                    }
                }
                if (!insideBox) {
                    candidates.add(new Position(x, y, z));
                }
            }
        }

        return candidates;
    }

    /**
     * 레거시 알고리즘: 기존 Bottom-Left-Fill 후보 생성
     */
    private static List<Position> generateLegacyCandidates(
            List<PlacedBox> placedBoxes, int truckL, int truckW, int truckH, int padding) {

        List<Position> candidates = new ArrayList<>();
        candidates.add(new Position(0, 0, 0)); // 원점은 항상 후보

        for (PlacedBox box : placedBoxes) {
            // 기본 3방향 모서리
            candidates.add(new Position(box.x + box.w + padding, box.y, box.z));
            candidates.add(new Position(box.x, box.y + box.h, box.z));
            candidates.add(new Position(box.x, box.y, box.z + box.l + padding));

            // 대각선 코너 (L자 공간 활용)
            candidates.add(new Position(box.x + box.w + padding, box.y, box.z + box.l + padding));
            candidates.add(new Position(box.x, box.y + box.h, box.z + box.l + padding));
            candidates.add(new Position(box.x + box.w + padding, box.y + box.h, box.z));

            // 벽면 정렬 후보
            candidates.add(new Position(0, box.y, box.z));
            candidates.add(new Position(box.x, 0, box.z));
            candidates.add(new Position(box.x, box.y, 0));
            candidates.add(new Position(0, 0, box.z + box.l + padding));
            candidates.add(new Position(0, box.y, 0));

            // 다른 박스들과의 간격 채우기
            for (PlacedBox other : placedBoxes) {
                if (other == box) continue;
                if (other.z > box.z + box.l + padding) {
                    candidates.add(new Position(box.x, box.y, box.z + box.l + padding));
                }
                if (other.x > box.x + box.w + padding) {
                    candidates.add(new Position(box.x + box.w + padding, box.y, box.z));
                }
            }
        }

        return candidates;
    }

    /**
     * Position: 배치 후보 위치
     */
    public static class Position {
        public final int x, y, z;

        public Position(int x, int y, int z) {
            this.x = x;
            this.y = y;
            this.z = z;
        }
    }

    /**
     * PlacedBox: 이미 배치된 박스 정보
     */
    public static class PlacedBox {
        public final int x, y, z;
        public final int w, h, l;
        public final double weightKg;
        public final boolean fragile;      // 파손주의 - 제한적 상부 적재 허용
        public final boolean easyBreak;    // 충격주의 - 상부 적재 금지
        public final boolean noStack;
        public final boolean bottomOnly;
        public final Double maxStackWeight;

        public PlacedBox(int x, int y, int z, int w, int h, int l,
                         double weightKg, boolean fragile, boolean easyBreak,
                         boolean noStack, boolean bottomOnly, Double maxStackWeight) {
            this.x = x;
            this.y = y;
            this.z = z;
            this.w = w;
            this.h = h;
            this.l = l;
            this.weightKg = weightKg;
            this.fragile = fragile;
            this.easyBreak = easyBreak;
            this.noStack = noStack;
            this.bottomOnly = bottomOnly;
            this.maxStackWeight = maxStackWeight;
        }
    }
}
