package app.adaplus.backend.dto.activity;

import app.adaplus.backend.entity.ReviewStatus;
import jakarta.validation.constraints.NotNull;

public record ReviewRequest(
        @NotNull(message = "Decision is required")
        ReviewStatus decision,
        String rejectionReason
) {}
