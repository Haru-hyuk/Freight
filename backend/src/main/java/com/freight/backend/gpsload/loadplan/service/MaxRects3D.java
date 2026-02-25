package com.freight.backend.gpsload.loadplan.service;

import java.util.ArrayList;
import java.util.List;

/**
 * MaxRects 3D: 빈 공간을 최대 직육면체(Free Box)로 관리
 * 참고: 프론트엔드 route-assembly-test.html의 MaxRects3D 클래스 Java 포팅
 */
public class MaxRects3D {

    private final int truckL;
    private final int truckW;
    private final int truckH;
    private List<FreeBox> freeBoxes;

    private static final int MIN_VOLUME = 1000; // 최소 1000cm³ 이하는 무시

    public MaxRects3D(int truckL, int truckW, int truckH) {
        this.truckL = truckL;
        this.truckW = truckW;
        this.truckH = truckH;
        this.freeBoxes = new ArrayList<>();
        // 초기 빈 공간 = 전체 트럭
        this.freeBoxes.add(new FreeBox(0, 0, 0, truckW, truckH, truckL));
    }

    /**
     * 박스 배치 후 빈 공간 분할
     */
    public void placeBox(int bx, int by, int bz, int bw, int bh, int bl) {
        List<FreeBox> newFreeBoxes = new ArrayList<>();
        FreeBox placedBox = new FreeBox(bx, by, bz, bw, bh, bl);

        for (FreeBox free : freeBoxes) {
            if (boxesIntersect(free, placedBox)) {
                // 겹치면 6방향으로 분할
                List<FreeBox> splits = splitFreeBox(free, bx, by, bz, bw, bh, bl);
                newFreeBoxes.addAll(splits);
            } else {
                // 안 겹치면 유지
                newFreeBoxes.add(free);
            }
        }

        // 포함 관계 제거 (작은 박스가 큰 박스에 포함되면 제거)
        this.freeBoxes = removeDominatedBoxes(newFreeBoxes);
    }

    private boolean boxesIntersect(FreeBox a, FreeBox b) {
        return !(a.x + a.w <= b.x || b.x + b.w <= a.x ||
                 a.y + a.h <= b.y || b.y + b.h <= a.y ||
                 a.z + a.l <= b.z || b.z + b.l <= a.z);
    }

    /**
     * 빈 공간을 6방향으로 분할
     */
    private List<FreeBox> splitFreeBox(FreeBox free, int bx, int by, int bz, int bw, int bh, int bl) {
        List<FreeBox> splits = new ArrayList<>();

        // X- 방향 (왼쪽 남은 공간)
        if (bx > free.x) {
            FreeBox box = new FreeBox(free.x, free.y, free.z, bx - free.x, free.h, free.l);
            if (box.volume() >= MIN_VOLUME) splits.add(box);
        }
        // X+ 방향 (오른쪽 남은 공간)
        if (bx + bw < free.x + free.w) {
            FreeBox box = new FreeBox(bx + bw, free.y, free.z, (free.x + free.w) - (bx + bw), free.h, free.l);
            if (box.volume() >= MIN_VOLUME) splits.add(box);
        }
        // Y- 방향 (아래 남은 공간)
        if (by > free.y) {
            FreeBox box = new FreeBox(free.x, free.y, free.z, free.w, by - free.y, free.l);
            if (box.volume() >= MIN_VOLUME) splits.add(box);
        }
        // Y+ 방향 (위쪽 남은 공간)
        if (by + bh < free.y + free.h) {
            FreeBox box = new FreeBox(free.x, by + bh, free.z, free.w, (free.y + free.h) - (by + bh), free.l);
            if (box.volume() >= MIN_VOLUME) splits.add(box);
        }
        // Z- 방향 (안쪽 남은 공간)
        if (bz > free.z) {
            FreeBox box = new FreeBox(free.x, free.y, free.z, free.w, free.h, bz - free.z);
            if (box.volume() >= MIN_VOLUME) splits.add(box);
        }
        // Z+ 방향 (바깥쪽 남은 공간)
        if (bz + bl < free.z + free.l) {
            FreeBox box = new FreeBox(free.x, free.y, bz + bl, free.w, free.h, (free.z + free.l) - (bz + bl));
            if (box.volume() >= MIN_VOLUME) splits.add(box);
        }

        return splits;
    }

    /**
     * 포함된 박스 제거 (큰 빈 공간만 유지)
     */
    private List<FreeBox> removeDominatedBoxes(List<FreeBox> boxes) {
        List<FreeBox> result = new ArrayList<>();
        for (int i = 0; i < boxes.size(); i++) {
            boolean dominated = false;
            for (int j = 0; j < boxes.size(); j++) {
                if (i != j && isContainedIn(boxes.get(i), boxes.get(j))) {
                    dominated = true;
                    break;
                }
            }
            if (!dominated) result.add(boxes.get(i));
        }
        return result;
    }

    private boolean isContainedIn(FreeBox a, FreeBox b) {
        return a.x >= b.x && a.y >= b.y && a.z >= b.z &&
               a.x + a.w <= b.x + b.w &&
               a.y + a.h <= b.y + b.h &&
               a.z + a.l <= b.z + b.l;
    }

    /**
     * 남은 빈 공간 총 부피
     */
    public long getRemainingVolume() {
        long vol = 0;
        for (FreeBox box : freeBoxes) {
            vol += box.volume();
        }
        return vol;
    }

    public List<FreeBox> getFreeBoxes() {
        return freeBoxes;
    }

    /**
     * FreeBox: 빈 공간을 나타내는 직육면체
     */
    public static class FreeBox {
        public final int x, y, z; // 위치
        public final int w, h, l; // 폭, 높이, 길이

        public FreeBox(int x, int y, int z, int w, int h, int l) {
            this.x = x;
            this.y = y;
            this.z = z;
            this.w = w;
            this.h = h;
            this.l = l;
        }

        public long volume() {
            return (long) w * h * l;
        }
    }
}
