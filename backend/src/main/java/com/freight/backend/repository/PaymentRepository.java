package com.freight.backend.repository;

import com.freight.backend.entity.Payment;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PaymentRepository extends JpaRepository<Payment, Long> {

    List<Payment> findByMatchId(Long matchId);

    /** 여러 매칭에 대한 결제 목록 (최신순). 화주 내 결제 목록 조회용 */
    List<Payment> findByMatchIdInOrderByCreatedAtDesc(List<Long> matchIds);

    Optional<Payment> findByOrderNo(String orderNo);
}
