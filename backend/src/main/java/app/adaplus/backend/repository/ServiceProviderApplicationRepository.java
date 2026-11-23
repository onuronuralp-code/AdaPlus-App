package app.adaplus.backend.repository;

import app.adaplus.backend.entity.ReviewStatus;
import app.adaplus.backend.entity.ServiceProviderApplication;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface ServiceProviderApplicationRepository extends JpaRepository<ServiceProviderApplication, UUID> {
    List<ServiceProviderApplication> findBySubmittedByIdOrderByCreatedAtDesc(UUID submittedById);
    List<ServiceProviderApplication> findByStatusOrderByCreatedAtDesc(ReviewStatus status);
}
