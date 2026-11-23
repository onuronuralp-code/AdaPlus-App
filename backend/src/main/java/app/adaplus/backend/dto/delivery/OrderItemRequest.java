package app.adaplus.backend.dto.delivery;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Positive;

public record OrderItemRequest(
        @NotBlank String name,
        @Positive int quantity
) {
}
