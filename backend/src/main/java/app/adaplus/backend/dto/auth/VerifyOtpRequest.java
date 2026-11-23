package app.adaplus.backend.dto.auth;

import jakarta.validation.constraints.*;

public record VerifyOtpRequest(

        // Mutually exclusive — exactly one of email or phone must be present
        @Email(message = "Invalid email address")
        String email,

        String phone,

        @NotBlank(message = "Verification code is required")
        @Pattern(regexp = "\\d{6}", message = "Verification code must be exactly 6 digits")
        String code
) {}
