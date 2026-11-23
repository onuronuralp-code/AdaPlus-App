package app.adaplus.backend.dto.providerapplication;

import app.adaplus.backend.entity.Island;
import app.adaplus.backend.entity.ServiceCategory;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record CreateServiceProviderApplicationRequest(
        @NotBlank(message = "Full name is required")
        @Size(max = 255, message = "Full name must not exceed 255 characters")
        String fullName,

        @NotBlank(message = "Contact phone number is required")
        @Size(max = 30, message = "Phone number must not exceed 30 characters")
        String phone,

        @NotNull(message = "Service island is required")
        Island island,

        @NotNull(message = "Service category is required")
        ServiceCategory category,

        @NotBlank(message = "Please describe the services you offer")
        @Size(max = 2000, message = "Service description must not exceed 2000 characters")
        String offeredServices,

        @Size(max = 2000, message = "Experience notes must not exceed 2000 characters")
        String experienceNotes
) {}
