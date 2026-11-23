package app.adaplus.backend.repository;

import app.adaplus.backend.entity.DeliveryOrder;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface DeliveryOrderRepository extends JpaRepository<DeliveryOrder, UUID> {
}
