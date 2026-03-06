package com.freight.backend.dto.admin;

import java.util.List;
import lombok.Builder;
import lombok.Getter;

/**
 * 페이지네이션 응답 DTO
 * @param <T> 응답 아이템 타입
 */
@Getter
@Builder
public class PaginatedResponse<T> {
    private final List<T> items;
    private final int total;

    public static <T> PaginatedResponse<T> of(List<T> items, int total) {
        return PaginatedResponse.<T>builder()
                .items(items)
                .total(total)
                .build();
    }
}
