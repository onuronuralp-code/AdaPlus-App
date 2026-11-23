package app.adaplus.backend.repository;

import app.adaplus.backend.entity.EmailVerification;
import app.adaplus.backend.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface EmailVerificationRepository extends JpaRepository<EmailVerification, UUID> {
    Optional<EmailVerification> findTopByUserOrderByCreatedAtDesc(User user);
    void deleteByUser(User user);
}
