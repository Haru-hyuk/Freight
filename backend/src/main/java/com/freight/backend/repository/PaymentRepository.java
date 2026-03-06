package com.freight.backend.repository;

import com.freight.backend.entity.Payment;
import java.util.List;
import java.util.Optional;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface PaymentRepository extends JpaRepository<Payment, Long> {

    List<Payment> findByMatchId(Long matchId);

    List<Payment> findByMatchIdIn(List<Long> matchIds);

    boolean existsByMatchId(Long matchId);

    /** 여러 매칭에 대한 결제 목록 (최신순). 화주 내 결제 목록 조회용 */
    List<Payment> findByMatchIdInOrderByCreatedAtDesc(List<Long> matchIds);

    Optional<Payment> findByOrderNo(String orderNo);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT p FROM Payment p WHERE p.orderNo = :orderNo")
    Optional<Payment> findByOrderNoForUpdate(@Param("orderNo") String orderNo);

    boolean existsByMatchIdAndStatus(Long matchId, Payment.PaymentStatus status);

    List<Payment> findByMatchIdAndStatus(Long matchId, Payment.PaymentStatus status);

    Optional<Payment> findFirstByMatchIdAndStatusOrderByCreatedAtDesc(Long matchId, Payment.PaymentStatus status);

    /** paymentKey(pgRef) 기준 결제 조회 - 멱등성 체크용 */
    Optional<Payment> findByPgRef(String pgRef);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT p FROM Payment p WHERE p.pgRef = :pgRef")
    Optional<Payment> findByPgRefForUpdate(@Param("pgRef") String pgRef);

    /** paymentKey(pgRef)가 이미 존재하는지 확인 */
    boolean existsByPgRefAndStatus(String pgRef, Payment.PaymentStatus status);
}
