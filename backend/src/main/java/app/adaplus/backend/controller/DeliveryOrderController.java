package app.adaplus.backend.controller;

import app.adaplus.backend.dto.delivery.OrderConfirmationDto;
import app.adaplus.backend.dto.delivery.SubmitOrderRequest;
import app.adaplus.backend.service.DeliveryOrderService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/delivery/orders")
@RequiredArgsConstructor
@Tag(name = "Delivery Orders", description = "Submit an order to an island delivery provider. Forwarded to the provider's WhatsApp number.")
public class DeliveryOrderController {

    private final DeliveryOrderService deliveryOrderService;

    @Operation(
            summary = "Submit an order",
            description = "Requires authentication. Ordering is limited to verified Islanders — same gate as the rest of the delivery feature."
    )
    @ApiResponses({
            @ApiResponse(responseCode = "201", description = "Order submitted"),
            @ApiResponse(responseCode = "401", description = "Missing/invalid JWT, or account is not a verified Islander"),
            @ApiResponse(responseCode = "404", description = "Unknown delivery provider")
    })
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public OrderConfirmationDto submitOrder(@Valid @RequestBody SubmitOrderRequest req) {
        return deliveryOrderService.submitOrder(req);
    }
}
