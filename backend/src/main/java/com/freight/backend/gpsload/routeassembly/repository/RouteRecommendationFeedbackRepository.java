package com.freight.backend.gpsload.routeassembly.repository;

import com.freight.backend.gpsload.routeassembly.entity.RouteRecommendationFeedback;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.Optional;

public interface RouteRecommendationFeedbackRepository extends JpaRepository<RouteRecommendationFeedback, Long> {

    Optional<RouteRecommendationFeedback> findByCalibrationId(String calibrationId);

    @Query("""
            SELECT r
            FROM RouteRecommendationFeedback r
            WHERE r.accepted IS NOT NULL
               OR r.completedOnTime IS NOT NULL
               OR r.cancelled IS NOT NULL
               OR r.realizedProfit IS NOT NULL
            ORDER BY r.updatedAt DESC
            """)
    List<RouteRecommendationFeedback> findLatestWithOutcome(Pageable pageable);

    @Query("""
            SELECT COUNT(r)
            FROM RouteRecommendationFeedback r
            WHERE r.accepted IS NOT NULL
               OR r.completedOnTime IS NOT NULL
               OR r.cancelled IS NOT NULL
               OR r.realizedProfit IS NOT NULL
            """)
    long countWithOutcome();
}

