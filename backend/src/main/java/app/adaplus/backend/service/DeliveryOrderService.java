package app.adaplus.backend.service;

import app.adaplus.backend.config.delivery.DeliveryProviderInfo;
import app.adaplus.backend.dto.delivery.OrderConfirmationDto;
import app.adaplus.backend.dto.delivery.OrderItemRequest;
import app.adaplus.backend.dto.delivery.SubmitOrderRequest;
import app.adaplus.backend.entity.DeliveryOrder;
import app.adaplus.backend.entity.User;
import app.adaplus.backend.entity.UserType;
import app.adaplus.backend.exception.ResourceNotFoundException;
import app.adaplus.backend.exception.UnauthorizedException;
import app.adaplus.backend.repository.DeliveryOrderRepository;
import app.adaplus.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Transactional
public class DeliveryOrderService {

    private final DeliveryOrderRepository deliveryOrderRepository;
    private final UserRepository userRepository;
    private final Map<String, DeliveryProviderInfo> deliveryProvidersById;
    private final WhatsAppService whatsAppService;

    public OrderConfirmationDto submitOrder(SubmitOrderRequest req) {
        User user = currentUser();

        // Same gate as the app's delivery UI — ordering is limited to verified Islanders,
        // enforced here too since the client-side check alone can't stop a direct API call.
        if (user.getUserType() != UserType.ISLAND_RESIDENT && user.getUserType() != UserType.ADMIN) {
            throw new UnauthorizedException("Ordering is currently limited to verified Islanders");
        }

        DeliveryProviderInfo provider = deliveryProvidersById.get(req.providerId());
        if (provider == null) {
            throw new ResourceNotFoundException("Unknown delivery provider: " + req.providerId());
        }

        String message = buildWhatsAppMessage(user, provider, req);
        boolean sent = whatsAppService.sendOrderMessage(provider.whatsappNumber(), message);

        DeliveryOrder order = deliveryOrderRepository.save(DeliveryOrder.builder()
                .user(user)
                .providerId(provider.id())
                .providerName(provider.name())
                .itemsSummary(formatItems(req.items()))
                .note(req.note())
                .deliveryAddress(req.deliveryAddress())
                .whatsappSent(sent)
                .build());

        return new OrderConfirmationDto(order.getId(), provider.name(), sent);
    }

    private String buildWhatsAppMessage(User user, DeliveryProviderInfo provider, SubmitOrderRequest req) {
        StringBuilder sb = new StringBuilder();
        sb.append("AdaPlus üzerinden yeni bir sipariş var!\n\n");
        sb.append(formatItems(req.items())).append("\n\n");
        if (req.deliveryAddress() != null && !req.deliveryAddress().isBlank()) {
            sb.append("Teslimat adresi: ").append(req.deliveryAddress()).append("\n");
        }
        if (req.note() != null && !req.note().isBlank()) {
            sb.append("Not: ").append(req.note()).append("\n");
        }
        sb.append("Müşteri: ").append(user.getFullName());
        if (user.getPhone() != null && !user.getPhone().isBlank()) {
            sb.append(" (").append(user.getPhone()).append(")");
        }
        return sb.toString();
    }

    private String formatItems(List<OrderItemRequest> items) {
        StringBuilder sb = new StringBuilder();
        for (OrderItemRequest item : items) {
            if (sb.length() > 0) sb.append("\n");
            sb.append("- ").append(item.quantity()).append("x ").append(item.name());
        }
        return sb.toString();
    }

    private User currentUser() {
        String principal = (String) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        return userRepository.findById(UUID.fromString(principal))
                .orElseThrow(() -> new UnauthorizedException("User not found"));
    }
}
