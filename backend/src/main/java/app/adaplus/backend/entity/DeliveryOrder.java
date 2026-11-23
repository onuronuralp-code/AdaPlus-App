package app.adaplus.backend.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "delivery_orders")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DeliveryOrder {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(name = "provider_id", nullable = false, length = 50)
    private String providerId;

    @Column(name = "provider_name", nullable = false, length = 200)
    private String providerName;

    @Column(name = "items_summary", nullable = false, columnDefinition = "TEXT")
    private String itemsSummary;

    @Column(length = 500)
    private String note;

    @Column(name = "delivery_address", length = 500)
    private String deliveryAddress;

    @Column(name = "whatsapp_sent", nullable = false)
    private boolean whatsappSent;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @PrePersist
    void prePersist() {
        createdAt = Instant.now();
    }
}
