package app.adaplus.backend.dto.auth;

import jakarta.validation.constraints.*;

public record LoginRequest(

        // Mutually exclusive — exactly one of email or phone must be present
        @Email(message = "Invalid email address")
        String email,

        @Size(max = 20, message = "Phone number must not exceed 20 characters")
        String phone,

        @NotBlank(message = "Password is required")
        String password
) {}
