package com.freight.backend.repository;

import com.freight.backend.entity.Truck;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

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

    @Query(
            value = """
                    SELECT COUNT(*)
                    FROM information_schema.columns
                    WHERE table_schema = DATABASE()
                      AND table_name = 'trucks'
                      AND column_name = 'truck_id'
                      AND LOWER(extra) LIKE '%auto_increment%'
                    """,
            nativeQuery = true
    )
    long countTruckIdAutoIncrementColumns();

    @Query(value = "SELECT COALESCE(MAX(truck_id), 0) + 1 FROM trucks", nativeQuery = true)
    Long findNextTruckIdCandidate();
}

