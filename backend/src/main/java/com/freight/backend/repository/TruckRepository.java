package com.freight.backend.repository;

import com.freight.backend.entity.Truck;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface TruckRepository extends JpaRepository<Truck, Long> {
    List<Truck> findByDriverId(Long driverId);
    List<Truck> findByDriverIdIn(List<Long> driverIds);
    List<Truck> findByApprovedFalseOrderByCreatedAtDesc();

    @Query("""
            SELECT COUNT(t)
            FROM Truck t
            WHERE UPPER(COALESCE(t.approvalStatus, '')) = 'PENDING'
               OR ((t.approvalStatus IS NULL OR TRIM(t.approvalStatus) = '')
               AND (t.approved IS NULL OR t.approved = false))
            """)
    long countPendingApprovals();

    @Query("""
            SELECT t
            FROM Truck t
            WHERE UPPER(COALESCE(t.approvalStatus, '')) = 'PENDING'
               OR ((t.approvalStatus IS NULL OR TRIM(t.approvalStatus) = '')
               AND (t.approved IS NULL OR t.approved = false))
            ORDER BY t.createdAt DESC
            """)
    List<Truck> findPendingApprovals();
}

