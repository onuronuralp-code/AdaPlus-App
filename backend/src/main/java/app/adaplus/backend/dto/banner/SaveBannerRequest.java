package app.adaplus.backend.dto.banner;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record SaveBannerRequest(
        @NotBlank @Size(max = 255) String title,
        @Size(max = 2000) String body,
        @Size(max = 500) String imageUrl,
        @Size(max = 500) String actionUrl,
        @Size(max = 100) String actionLabel,
        boolean active
) {}
