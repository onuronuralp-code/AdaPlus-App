package app.adaplus.backend.dto.demand;

import jakarta.validation.constraints.NotEmpty;

import java.util.List;

public record DeliveryVoteRequest(
        @NotEmpty List<String> options,
        String otherText,
        String island
) {}
