package app.adaplus.backend.dto.delivery;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Size;

import java.util.List;

public record SubmitOrderRequest(
        @NotBlank String providerId,
        @NotEmpty @Valid List<OrderItemRequest> items,
        @Size(max = 500) String note,
        @Size(max = 500) String deliveryAddress
) {
}
