package app.adaplus.backend.dto.forum;

import com.fasterxml.jackson.annotation.JsonProperty;
import java.util.UUID;

public record PollOptionDto(
        UUID id,
        String text,
        long voteCount,
        double percentage,  // 0–100, rounded to 1 decimal
        @JsonProperty("isVoted") boolean isVoted
) {}
