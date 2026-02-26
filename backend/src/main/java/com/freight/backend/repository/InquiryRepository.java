package com.freight.backend.repository;

import com.freight.backend.entity.Inquiry;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface InquiryRepository extends JpaRepository<Inquiry, Long> {
    List<Inquiry> findByShipperIdOrderByCreatedAtDesc(Long shipperId);
    List<Inquiry> findByDriverIdOrderByCreatedAtDesc(Long driverId);
    List<Inquiry> findAllByOrderByCreatedAtDesc();
}
