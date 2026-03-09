package com.freight.backend.geocoding;

import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface GeocodingCacheRepository extends JpaRepository<GeocodingCache, Long> {

    Optional<GeocodingCache> findByCacheKey(String cacheKey);
}

