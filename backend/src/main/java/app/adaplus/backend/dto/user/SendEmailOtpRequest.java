package app.adaplus.backend.dto.user;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

public record SendEmailOtpRequest(
        @NotBlank(message = "Email is required")
        @Email(message = "Invalid email address")
        String email
) {}
