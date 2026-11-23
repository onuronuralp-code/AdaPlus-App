package app.adaplus.backend.dto.forum;

import app.adaplus.backend.entity.PostType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.util.List;
import java.util.UUID;

public record CreatePostRequest(

        // For messages: the message text — optional when a photo is attached.
        // For polls: the poll question ("ANKET BAŞLIĞI"), always required.
        @Size(max = 500, message = "Content must not exceed 500 characters")
        String content,

        // MESSAGE or POLL. Defaults to MESSAGE when omitted.
        PostType postType,

        // Required when postType = POLL. Min 2, max 6 options.
        List<@NotBlank(message = "Option text must not be blank") @Size(max = 255) String> pollOptions,

        // Optional photo (not applicable for polls)
        @Size(max = 500)
        String imageUrl,

        // Optional — post without a topic goes to the general feed
        UUID topicId,

        // If provided, this is a reply to the given post
        UUID parentId,

        boolean anonymous,

        // Required when postType = POLL. How long the poll stays open (hours). Min 1, max 168 (7 days).
        Integer pollDurationHours
) {}
