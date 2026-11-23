package app.adaplus.backend.dto.notification;

import app.adaplus.backend.entity.Notification;
import app.adaplus.backend.entity.NotificationType;

import java.time.Instant;
import java.util.UUID;

public record NotificationDto(
        UUID id,
        NotificationType type,
        String title,
        String body,
        UUID referenceId,
        boolean read,
        Instant createdAt
) {
    public static NotificationDto from(Notification n) {
        return new NotificationDto(
                n.getId(),
                n.getType(),
                n.getTitle(),
                n.getBody(),
                n.getReferenceId(),
                n.isRead(),
                n.getCreatedAt()
        );
    }
}
