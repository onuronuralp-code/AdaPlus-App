package app.adaplus.backend.dto.user;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record UpdateUserRequest(

        @NotBlank(message = "Full name is required")
        @Size(min = 2, max = 100, message = "Full name must be between 2 and 100 characters")
        @Pattern(regexp = "^[\\p{L} .'-]+$", message = "Full name can only contain letters, spaces, hyphens, apostrophes, and dots")
        String fullName,

        @Size(max = 500, message = "Address must be at most 500 characters")
        String address
) {}
