package app.adaplus.backend.dto.user;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

public record VerifyPhoneRequest(
        @NotBlank(message = "Phone number is required")
        String phone,

        @NotBlank(message = "Verification code is required")
        @Pattern(regexp = "\\d{6}", message = "Verification code must be exactly 6 digits")
        String code
) {}
