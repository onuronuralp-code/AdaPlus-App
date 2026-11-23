package app.adaplus.backend.dto.notification;

import app.adaplus.backend.entity.DevicePlatform;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record RegisterDeviceTokenRequest(
        @NotBlank String token,
        @NotNull DevicePlatform platform
) {}
