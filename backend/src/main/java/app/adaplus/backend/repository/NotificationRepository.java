package app.adaplus.backend.repository;

import app.adaplus.backend.entity.Notification;
import app.adaplus.backend.entity.NotificationType;
import app.adaplus.backend.entity.User;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public interface NotificationRepository extends JpaRepository<Notification, UUID> {

    // Bounded: callers must supply a Pageable (e.g. PageRequest.of(0, 50))
    List<Notification> findByUserOrderByCreatedAtDesc(User user, Pageable pageable);

    long countByUserAndReadFalse(User user);

    boolean existsByUser_IdAndTypeAndReferenceIdAndReadFalse(UUID userId, NotificationType type, UUID referenceId);

    @Modifying
    @Query("UPDATE Notification n SET n.read = true WHERE n.user = :user AND n.read = false")
    void markAllReadByUser(User user);

    // Used by the nightly pruning job to delete old read notifications
    @Modifying
    @Query("DELETE FROM Notification n WHERE n.read = true AND n.createdAt < :cutoff")
    int deleteReadOlderThan(@Param("cutoff") Instant cutoff);
}
