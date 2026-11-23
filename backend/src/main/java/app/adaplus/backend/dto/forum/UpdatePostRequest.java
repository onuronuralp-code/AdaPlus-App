package app.adaplus.backend.dto.forum;

import jakarta.validation.constraints.Size;

public record UpdatePostRequest(

        // Optional when the post keeps a photo; otherwise 3–1000 characters (checked in PostService)
        @Size(max = 1000, message = "Content must be between 3 and 1000 characters")
        String content,

        @Size(max = 500)
        String imageUrl
) {}
