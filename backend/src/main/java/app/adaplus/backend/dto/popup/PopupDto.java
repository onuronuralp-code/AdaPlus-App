package app.adaplus.backend.dto.popup;

import app.adaplus.backend.entity.Popup;

import java.time.Instant;
import java.util.UUID;

public record PopupDto(
        UUID id,
        String title,
        String body,
        String imageUrl,
        String actionUrl,
        String actionLabel,
        boolean active,
        Instant createdAt
) {
    public static PopupDto from(Popup p) {
        return new PopupDto(
                p.getId(),
                p.getTitle(),
                p.getBody(),
                p.getImageUrl(),
                p.getActionUrl(),
                p.getActionLabel(),
                p.isActive(),
                p.getCreatedAt()
        );
    }
}
