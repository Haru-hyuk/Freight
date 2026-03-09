package com.freight.backend.repository;

import com.freight.backend.entity.Driver;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface DriverRepository extends JpaRepository<Driver, Long> {

    Optional<Driver> findByEmail(String email);

    List<Driver> findByStatusIgnoreCase(String status);

    long countByCreatedAtAfter(LocalDateTime after);

    @Query("""
            SELECT COUNT(d)
            FROM Driver d
            WHERE UPPER(COALESCE(d.status, '')) = 'PENDING_APPROVAL'
               OR (d.licenseVerified = false AND UPPER(COALESCE(d.status, '')) <> 'SUSPENDED')
            """)
    long countPendingApprovals();

    @Query("""
            SELECT d
            FROM Driver d
            WHERE UPPER(COALESCE(d.status, '')) = 'PENDING_APPROVAL'
               OR (d.licenseVerified = false AND UPPER(COALESCE(d.status, '')) <> 'SUSPENDED')
            ORDER BY d.createdAt DESC
            """)
    List<Driver> findPendingApprovals();
}
