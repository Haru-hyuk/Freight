package com.freight.backend.repository;

import com.freight.backend.entity.Match;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface MatchRepository extends JpaRepository<Match, Long> {

    /**
     * 견적 ID로 매칭 조회
     */
    Optional<Match> findByQuoteId(Long quoteId);

    /**
     * 아직 수락되지 않은 공개 매칭 목록 (기사용)
     */
    List<Match> findByAcceptedFalseAndStatus(Match.Status status);

    /**
     * 기사의 모든 매칭 조회
     */
    List<Match> findByDriverId(Long driverId);

    /**
     * 기사의 특정 상태 매칭 조회
     */
    List<Match> findByDriverIdAndStatus(Long driverId, Match.Status status);

    /**
     * 기사의 특정 상태가 아닌 매칭 조회 (예: 취소 제외)
     */
    List<Match> findByDriverIdAndStatusNot(Long driverId, Match.Status status);

    /**
     * 특정 상태의 모든 매칭 조회
     */
    List<Match> findByStatus(Match.Status status);

    /**
     * 견적에 대해 취소되지 않은 매칭이 있는지 확인 (다른 로직에서 필요 시 사용)
     */
    boolean existsByQuoteIdAndStatusNot(Long quoteId, Match.Status status);

    /**
     * 화주가 생성한 매칭 목록 (해당 화주의 견적에 대한 매칭, 취소 제외)
     */
    @Query("SELECT m FROM Match m WHERE m.quoteId IN (SELECT q.quoteId FROM Quote q WHERE q.shipperId = :shipperId) AND m.status <> 'CANCELLED'")
    List<Match> findByShipperIdAndStatusNotCancelled(@Param("shipperId") Long shipperId);
}
