package app.adaplus.backend.repository;

import app.adaplus.backend.entity.PasswordReset;
import app.adaplus.backend.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface PasswordResetRepository extends JpaRepository<PasswordReset, UUID> {
    Optional<PasswordReset> findByToken(String token);
    Optional<PasswordReset> findTopByUserOrderByCreatedAtDesc(User user);
    void deleteByUser(User user);
}
