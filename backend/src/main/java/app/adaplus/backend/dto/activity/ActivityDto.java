package app.adaplus.backend.dto.activity;

import app.adaplus.backend.entity.Activity;
import app.adaplus.backend.entity.ReviewStatus;

import java.time.Instant;
import java.util.UUID;

public record ActivityDto(
        UUID id,
        String name,
        String description,
        Instant startDate,
        Instant endDate,
        String organizerName,
        String organizerContact,
        String eventPlace,
        String instagramLink,
        String imageUrl,
        app.adaplus.backend.entity.Island island,
        ReviewStatus status,
        String rejectionReason,
        UUID submittedById,
        Instant createdAt,
        Instant updatedAt,
        long rsvpCount,
        boolean userHasRsvp
) {
    public static ActivityDto from(Activity a) {
        return from(a, 0, false);
    }

    public static ActivityDto from(Activity a, long rsvpCount, boolean userHasRsvp) {
        return new ActivityDto(
                a.getId(),
                a.getName(),
                a.getDescription(),
                a.getStartDate(),
                a.getEndDate(),
                a.getOrganizerName(),
                a.getOrganizerContact(),
                a.getEventPlace(),
                a.getInstagramLink(),
                a.getImageUrl(),
                a.getIsland(),
                a.getStatus(),
                a.getRejectionReason(),
                a.getSubmittedBy() != null ? a.getSubmittedBy().getId() : null,
                a.getCreatedAt(),
                a.getUpdatedAt(),
                rsvpCount,
                userHasRsvp
        );
    }
}
