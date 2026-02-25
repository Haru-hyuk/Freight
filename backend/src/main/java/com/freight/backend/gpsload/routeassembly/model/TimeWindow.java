package com.freight.backend.gpsmiss.routeassembly.model;

import java.time.LocalDateTime;

/**
 * 시간 창 (Time Window)
 * 픽업/배송 가능 시간 범위를 정의
 */
public record TimeWindow(
        LocalDateTime start,
        LocalDateTime end
) {
    /**
     * 두 시간창이 겹치는지 확인
     */
    public boolean overlapsWith(TimeWindow other) {
        if (this.start == null || this.end == null || other.start == null || other.end == null) {
            return true; // null인 경우 제한 없음으로 간주
        }
        return !this.end.isBefore(other.start) && !other.end.isBefore(this.start);
    }

    /**
     * 특정 시간이 이 시간창 내에 있는지 확인
     */
    public boolean contains(LocalDateTime time) {
        if (time == null) return true;
        if (start == null && end == null) return true;
        if (start == null) return !time.isAfter(end);
        if (end == null) return !time.isBefore(start);
        return !time.isBefore(start) && !time.isAfter(end);
    }

    /**
     * 시간창의 길이(분)
     */
    public long durationMinutes() {
        if (start == null || end == null) return Long.MAX_VALUE;
        return java.time.Duration.between(start, end).toMinutes();
    }
}
