package app.adaplus.backend.dto.contact;

import jakarta.validation.constraints.*;

public record ContactRequest(

        @NotBlank(message = "Full name is required")
        @Size(min = 2, max = 100, message = "Full name must be between 2 and 100 characters")
        @Pattern(regexp = "^[\\p{L} .'-]+$", message = "Full name can only contain letters, spaces, hyphens, apostrophes, and dots")
        String fullName,

        @NotBlank(message = "Email is required")
        @Email(message = "Invalid email address")
        @Size(max = 255, message = "Email must not exceed 255 characters")
        String email,

        @NotBlank(message = "Message is required")
        @Size(min = 10, max = 2000, message = "Message must be between 10 and 2000 characters")
        String message
) {}
