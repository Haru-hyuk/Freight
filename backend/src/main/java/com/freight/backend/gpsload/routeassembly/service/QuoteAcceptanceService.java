package com.freight.backend.gpsmiss.routeassembly.service;

import com.freight.backend.gpsmiss.routeassembly.model.RouteAcceptRequest;
import com.freight.backend.gpsmiss.routeassembly.model.RouteAcceptResponse;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * 추천 수락 처리 서비스.
 * 최소 구현: quotes.status를 OPEN -> MATCHED로 전이.
 */
@Service
public class QuoteAcceptanceService {

    private final JdbcTemplate jdbcTemplate;

    public QuoteAcceptanceService(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    @Transactional
    public RouteAcceptResponse accept(RouteAcceptRequest request) {
        if (request == null || !request.isValid()) {
            return RouteAcceptResponse.failure("유효하지 않은 수락 요청입니다.", 0, 0, List.of());
        }

        // 중복 quoteId 제거 (요청 순서 유지)
        Set<Long> uniqueIds = new LinkedHashSet<>(request.quoteIds());
        List<Long> quoteIds = new ArrayList<>(uniqueIds);
        int requestedCount = quoteIds.size();

        // 모두 OPEN인지 먼저 확인 (all-or-nothing)
        int openCount = countOpenQuotes(quoteIds);
        if (openCount != requestedCount) {
            return RouteAcceptResponse.failure(
                    "수락 실패: 일부 견적이 이미 배정되었거나 OPEN 상태가 아닙니다.",
                    requestedCount,
                    0,
                    List.of()
            );
        }

        int acceptedCount = bulkMatchQuotes(quoteIds);
        if (acceptedCount != requestedCount) {
            // 이론상 드물지만 동시성 경합 대비: 트랜잭션 롤백을 유도
            throw new IllegalStateException(
                    "수락 처리 중 동시성 충돌이 발생했습니다. 다시 시도해주세요. "
                            + "(expected=" + requestedCount + ", actual=" + acceptedCount + ")"
            );
        }

        return RouteAcceptResponse.success(
                "수락 완료: 모든 견적이 MATCHED로 전환되었습니다.",
                requestedCount,
                acceptedCount,
                quoteIds
        );
    }

    private int countOpenQuotes(List<Long> quoteIds) {
        String inClause = quoteIds.stream().map(id -> "?").collect(Collectors.joining(","));
        String sql = "SELECT COUNT(*) FROM quotes WHERE quote_id IN (" + inClause + ") AND status = 'OPEN'";
        Integer count = jdbcTemplate.queryForObject(sql, Integer.class, quoteIds.toArray());
        return count != null ? count : 0;
    }

    private int bulkMatchQuotes(List<Long> quoteIds) {
        String inClause = quoteIds.stream().map(id -> "?").collect(Collectors.joining(","));
        String sql = "UPDATE quotes SET status = 'MATCHED' WHERE quote_id IN (" + inClause + ") AND status = 'OPEN'";
        return jdbcTemplate.update(sql, quoteIds.toArray());
    }
}
