package app.adaplus.backend.service;

import app.adaplus.backend.dto.notification.NotificationDto;
import app.adaplus.backend.entity.Notification;
import app.adaplus.backend.entity.NotificationType;
import app.adaplus.backend.entity.User;
import app.adaplus.backend.exception.ResourceNotFoundException;
import app.adaplus.backend.exception.UnauthorizedException;
import app.adaplus.backend.repository.NotificationRepository;
import app.adaplus.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.PageRequest;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Transactional
@Slf4j
public class NotificationService {

    private static final int PAGE_SIZE = 50;

    private final NotificationRepository notificationRepository;
    private final UserRepository userRepository;

    @Transactional(readOnly = true)
    public List<NotificationDto> getNotifications(UUID userId) {
        User user = findUser(userId);
        return notificationRepository.findByUserOrderByCreatedAtDesc(
                        user, PageRequest.of(0, PAGE_SIZE))
                .stream()
                .map(NotificationDto::from)
                .toList();
    }

    // Prune read notifications older than 30 days nightly at 03:30 Istanbul time
    @Scheduled(cron = "0 30 3 * * *", zone = "Europe/Istanbul")
    @Transactional
    public void pruneOldNotifications() {
        Instant cutoff = Instant.now().minus(30, ChronoUnit.DAYS);
        int deleted = notificationRepository.deleteReadOlderThan(cutoff);
        if (deleted > 0) {
            log.info("Pruned {} read notifications older than 30 days", deleted);
        }
    }

    @Transactional(readOnly = true)
    public long getUnreadCount(UUID userId) {
        User user = findUser(userId);
        return notificationRepository.countByUserAndReadFalse(user);
    }

    public void markOneRead(UUID notificationId, UUID userId) {
        Notification n = notificationRepository.findById(notificationId)
                .orElseThrow(() -> new ResourceNotFoundException("Notification not found"));
        if (!n.getUser().getId().equals(userId)) {
            throw new UnauthorizedException("Not your notification");
        }
        n.setRead(true);
        notificationRepository.save(n);
    }

    public void markAllRead(UUID userId) {
        User user = findUser(userId);
        notificationRepository.markAllReadByUser(user);
    }

    public void push(UUID recipientId, NotificationType type, String title, String body, UUID referenceId) {
        User recipient = userRepository.findById(recipientId).orElse(null);
        if (recipient == null) return;
        // Deduplicate: skip LIKE if the user already has an unread LIKE for this post
        if (type == NotificationType.LIKE && referenceId != null
                && notificationRepository.existsByUser_IdAndTypeAndReferenceIdAndReadFalse(recipientId, type, referenceId)) {
            return;
        }
        notificationRepository.save(Notification.builder()
                .user(recipient)
                .type(type)
                .title(title)
                .body(body)
                .referenceId(referenceId)
                .build());
    }

    private User findUser(UUID id) {
        return userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
    }
}
