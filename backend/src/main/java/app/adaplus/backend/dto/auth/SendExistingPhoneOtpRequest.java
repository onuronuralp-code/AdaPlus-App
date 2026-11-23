package app.adaplus.backend.dto.auth;

import jakarta.validation.constraints.NotBlank;

public record SendExistingPhoneOtpRequest(
        @NotBlank(message = "Phone number is required")
        String phone
) {}
