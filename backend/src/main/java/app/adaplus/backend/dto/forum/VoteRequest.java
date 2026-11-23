package app.adaplus.backend.dto.forum;

import jakarta.validation.constraints.NotNull;

import java.util.UUID;

public record VoteRequest(
        @NotNull(message = "Option ID is required")
        UUID optionId
) {}
