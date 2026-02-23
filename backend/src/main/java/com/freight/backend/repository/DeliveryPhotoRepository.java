package com.freight.backend.repository;

import com.freight.backend.entity.DeliveryPhoto;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface DeliveryPhotoRepository extends JpaRepository<DeliveryPhoto, Long> {
    List<DeliveryPhoto> findByMatchIdOrderByCreatedAtAsc(Long matchId);
}

