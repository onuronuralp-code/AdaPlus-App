package app.adaplus.backend.dto.delivery;

import java.util.UUID;

public record OrderConfirmationDto(
        UUID orderId,
        String providerName,
        boolean whatsappSent
) {
}
