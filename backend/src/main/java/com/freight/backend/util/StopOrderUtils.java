package com.freight.backend.util;

/**
 * 배송 순서(견적 단위)와 화물 하차 순번(아이템 단위)을 결합할 때 사용하는 공통 유틸.
 */
public final class StopOrderUtils {

    private static final int MIN_ORDER = 1;
    private static final int MAX_DROP_SEQ = 999;
    private static final int ORDER_MULTIPLIER = 1000;

    private StopOrderUtils() {
    }

    /**
     * dropStopSeq 값 정규화.
     * - null 또는 1 미만: null
     * - 1 이상: 최대 999로 clamp
     */
    public static Integer normalizeDropStopSeq(Integer dropStopSeq) {
        if (dropStopSeq == null || dropStopSeq < MIN_ORDER) {
            return null;
        }
        return Math.min(MAX_DROP_SEQ, dropStopSeq);
    }

    /**
     * 견적 기본 순서와 화물 하차 순번을 안정적으로 합성한다.
     */
    public static int mergeStopOrder(int defaultOrder, Integer dropStopSeq) {
        int safeDefault = Math.max(MIN_ORDER, defaultOrder);
        Integer normalizedDropSeq = normalizeDropStopSeq(dropStopSeq);
        if (normalizedDropSeq == null) {
            return safeDefault;
        }
        return safeDefault * ORDER_MULTIPLIER + normalizedDropSeq;
    }
}

