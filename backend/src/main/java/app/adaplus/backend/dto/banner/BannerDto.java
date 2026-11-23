package app.adaplus.backend.dto.banner;

import app.adaplus.backend.entity.Banner;

import java.time.Instant;
import java.util.UUID;

public record BannerDto(
        UUID id,
        String title,
        String body,
        String imageUrl,
        String actionUrl,
        String actionLabel,
        boolean active,
        Instant createdAt
) {
    public static BannerDto from(Banner b) {
        return new BannerDto(
                b.getId(),
                b.getTitle(),
                b.getBody(),
                b.getImageUrl(),
                b.getActionUrl(),
                b.getActionLabel(),
                b.isActive(),
                b.getCreatedAt()
        );
    }
}
