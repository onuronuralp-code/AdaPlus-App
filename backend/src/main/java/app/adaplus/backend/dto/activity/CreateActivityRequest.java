package app.adaplus.backend.dto.activity;

import jakarta.validation.constraints.*;

import java.time.Instant;

// All fields are optional — events are accepted with whatever details the organizer provides.
public record CreateActivityRequest(

        @Size(max = 255, message = "Activity name must not exceed 255 characters")
        String name,

        @Size(max = 500, message = "Activity details must not exceed 500 characters")
        String description,

        Instant startDate,

        Instant endDate,

        @Size(max = 255, message = "Organizer name must not exceed 255 characters")
        String organizerName,

        @Size(max = 30, message = "Contact number must not exceed 30 characters")
        String organizerContact,

        @Size(max = 255, message = "Activity place must not exceed 255 characters")
        String eventPlace,

        @Size(max = 500, message = "Instagram link must not exceed 500 characters")
        @Pattern(regexp = "^(https?://.+)?$", message = "Instagram link must be a valid URL starting with http:// or https://")
        String instagramLink,

        @Size(max = 500, message = "Image URL must not exceed 500 characters")
        String imageUrl,

        app.adaplus.backend.entity.Island island
) {}
