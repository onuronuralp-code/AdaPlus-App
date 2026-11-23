package app.adaplus.backend.dto.user;

import jakarta.validation.constraints.NotBlank;

public record SendPhoneOtpRequest(
        @NotBlank(message = "Phone number is required")
        String phone
) {}
