package app.adaplus.backend.dto.forum;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record CreateTopicRequest(

        @NotBlank(message = "Topic name is required")
        @Size(min = 2, max = 100, message = "Topic name must be between 2 and 100 characters")
        @Pattern(regexp = "^[\\p{L}\\p{N} _\\-]+$",
                 message = "Topic name can only contain letters, numbers, spaces, hyphens, and underscores")
        String name
) {}
