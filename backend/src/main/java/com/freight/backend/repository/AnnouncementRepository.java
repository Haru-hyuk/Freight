package com.freight.backend.repository;

import com.freight.backend.entity.Announcement;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AnnouncementRepository extends JpaRepository<Announcement, Long> {
    List<Announcement> findAllByOrderByCreatedAtDesc();

    List<Announcement> findAllByPublishedAtIsNotNullOrderByIsPinnedDescPublishedAtDescCreatedAtDesc();
}
