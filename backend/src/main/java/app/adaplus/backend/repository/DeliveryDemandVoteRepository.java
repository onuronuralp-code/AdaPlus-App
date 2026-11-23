package app.adaplus.backend.repository;

import app.adaplus.backend.entity.DeliveryDemandVote;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface DeliveryDemandVoteRepository extends JpaRepository<DeliveryDemandVote, UUID> {

    boolean existsByUserId(UUID userId);
}
