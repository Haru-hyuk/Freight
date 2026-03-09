package com.freight.backend.repository;

import com.freight.backend.entity.FcmToken;
import com.freight.backend.entity.Notification;
import java.time.LocalDateTime;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.domain.Pageable;
import org.springframework.data.repository.query.Param;

public interface NotificationRepository extends JpaRepository<Notification, Long> {
    List<Notification> findByReceiverTypeAndReceiverIdOrderByCreatedAtDesc(FcmToken.UserType receiverType, Long receiverId);

    long countByReceiverTypeAndReceiverIdAndIsReadFalse(FcmToken.UserType receiverType, Long receiverId);

    long countByMatchIdAndIsReadFalse(Long matchId);

    List<Notification> findByReceiverTypeIsNullAndIdGreaterThanOrderByIdAsc(Long id, Pageable pageable);

    @Query("""
            SELECT n.matchId, COUNT(n)
            FROM Notification n
            WHERE n.matchId IN :matchIds
              AND n.isRead = false
            GROUP BY n.matchId
            """)
    List<Object[]> countUnreadByMatchIds(@Param("matchIds") List<Long> matchIds);

    void deleteByMatchId(Long matchId);

    @Modifying
    @Query("DELETE FROM Notification n WHERE n.createdAt < :threshold")
    int deleteByCreatedAtBefore(@Param("threshold") LocalDateTime threshold);
}
