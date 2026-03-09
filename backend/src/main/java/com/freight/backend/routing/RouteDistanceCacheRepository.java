package com.freight.backend.routing;

import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface RouteDistanceCacheRepository extends JpaRepository<RouteDistanceCache, Long> {

    Optional<RouteDistanceCache> findByCacheKey(String cacheKey);
}
