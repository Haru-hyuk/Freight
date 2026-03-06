package com.freight.backend.service;

import com.freight.backend.entity.Admin;
import com.freight.backend.entity.FcmToken;
import com.freight.backend.entity.Match;
import com.freight.backend.entity.Notification;
import com.freight.backend.entity.Quote;
import com.freight.backend.repository.AdminRepository;
import com.freight.backend.repository.DriverRepository;
import com.freight.backend.repository.MatchRepository;
import com.freight.backend.repository.NotificationRepository;
import com.freight.backend.repository.QuoteRepository;
import com.freight.backend.repository.ShipperRepository;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
@Slf4j
public class NotificationReceiverTypeBackfillService {

    private static final int BATCH_SIZE = 500;

    private final NotificationRepository notificationRepository;
    private final DriverRepository driverRepository;
    private final ShipperRepository shipperRepository;
    private final AdminRepository adminRepository;
    private final MatchRepository matchRepository;
    private final QuoteRepository quoteRepository;

    @EventListener(ApplicationReadyEvent.class)
    public void backfillLegacyNotificationReceiverType() {
        long cursor = 0L;
        int scanned = 0;
        int updated = 0;
        int unresolved = 0;

        while (true) {
            List<Notification> batch = notificationRepository.findByReceiverTypeIsNullAndIdGreaterThanOrderByIdAsc(
                    cursor,
                    PageRequest.of(0, BATCH_SIZE)
            );
            if (batch.isEmpty()) {
                break;
            }

            scanned += batch.size();
            int resolved = resolveBatch(batch);
            updated += resolved;
            unresolved += (batch.size() - resolved);
            cursor = batch.get(batch.size() - 1).getId();

            if (batch.size() < BATCH_SIZE) {
                break;
            }
        }

        if (scanned > 0) {
            log.info("Notification receiver_type backfill completed. scanned={}, updated={}, unresolved={}",
                    scanned, updated, unresolved);
        }
    }

    private int resolveBatch(List<Notification> batch) {
        Set<Long> receiverIds = new HashSet<>();
        Set<Long> matchIds = new HashSet<>();
        for (Notification notification : batch) {
            if (notification.getReceiverId() != null) {
                receiverIds.add(notification.getReceiverId());
            }
            if (notification.getMatchId() != null) {
                matchIds.add(notification.getMatchId());
            }
        }

        Set<Long> driverIds = new HashSet<>();
        driverRepository.findAllById(receiverIds).forEach(driver -> driverIds.add(driver.getDriverId()));

        Set<Long> shipperIds = new HashSet<>();
        shipperRepository.findAllById(receiverIds).forEach(shipper -> shipperIds.add(shipper.getShipperId()));

        Set<Long> adminIds = new HashSet<>();
        adminRepository.findAllById(receiverIds).stream()
                .map(Admin::getAdminId)
                .forEach(adminIds::add);

        Map<Long, Match> matchById = new HashMap<>();
        matchRepository.findAllById(matchIds).forEach(match -> matchById.put(match.getMatchId(), match));

        Set<Long> quoteIds = new HashSet<>();
        for (Match match : matchById.values()) {
            if (match.getQuoteId() != null) {
                quoteIds.add(match.getQuoteId());
            }
        }

        Map<Long, Quote> quoteById = new HashMap<>();
        quoteRepository.findAllById(quoteIds).forEach(quote -> quoteById.put(quote.getQuoteId(), quote));

        List<Notification> changed = new ArrayList<>();
        for (Notification notification : batch) {
            if (notification.getReceiverType() != null || notification.getReceiverId() == null) {
                continue;
            }

            Long receiverId = notification.getReceiverId();
            boolean isDriver = driverIds.contains(receiverId);
            boolean isShipper = shipperIds.contains(receiverId);
            boolean isAdmin = adminIds.contains(receiverId);

            FcmToken.UserType resolvedType = resolveUserType(notification, receiverId, isDriver, isShipper, isAdmin, matchById, quoteById);
            if (resolvedType != null) {
                notification.assignReceiverType(resolvedType);
                changed.add(notification);
            }
        }

        if (!changed.isEmpty()) {
            notificationRepository.saveAll(changed);
        }

        return changed.size();
    }

    private FcmToken.UserType resolveUserType(
            Notification notification,
            Long receiverId,
            boolean isDriver,
            boolean isShipper,
            boolean isAdmin,
            Map<Long, Match> matchById,
            Map<Long, Quote> quoteById
    ) {
        if (isDriver && !isShipper && !isAdmin) {
            return FcmToken.UserType.DRIVER;
        }
        if (isShipper && !isDriver && !isAdmin) {
            return FcmToken.UserType.SHIPPER;
        }
        if (isAdmin && !isDriver && !isShipper) {
            return FcmToken.UserType.ADMIN;
        }

        Long matchId = notification.getMatchId();
        if (matchId == null) {
            return null;
        }

        Match match = matchById.get(matchId);
        if (match == null) {
            return null;
        }

        if (receiverId.equals(match.getDriverId())) {
            return FcmToken.UserType.DRIVER;
        }

        Quote quote = quoteById.get(match.getQuoteId());
        if (quote != null && receiverId.equals(quote.getShipperId())) {
            return FcmToken.UserType.SHIPPER;
        }

        if (isAdmin) {
            return FcmToken.UserType.ADMIN;
        }

        return null;
    }
}
