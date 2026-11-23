package app.adaplus.backend.dto.auth;

import jakarta.validation.constraints.Email;

public record ResendVerificationRequest(

        @Email(message = "Invalid email address")
        String email,

        String phone
) {}
