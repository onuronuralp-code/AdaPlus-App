package app.adaplus.backend.dto.admin;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record BroadcastNotificationRequest(
        @NotBlank @Size(max = 100) String title,
        @NotBlank @Size(max = 500) String body,
        String island  // optional — if provided, only sent to users on that island
) {}
