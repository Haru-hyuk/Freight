package com.freight.backend.repository;

import com.freight.backend.entity.DeliveryPhoto;
import java.util.Optional;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface DeliveryPhotoRepository extends JpaRepository<DeliveryPhoto, Long> {
    List<DeliveryPhoto> findByMatchIdOrderByCreatedAtAsc(Long matchId);

    boolean existsByMatchIdAndType(Long matchId, DeliveryPhoto.Type type);

    Optional<DeliveryPhoto> findFirstByMatchIdAndTypeOrderByCreatedAtDesc(Long matchId, DeliveryPhoto.Type type);
}

