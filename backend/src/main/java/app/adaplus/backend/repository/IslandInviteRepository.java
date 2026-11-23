package app.adaplus.backend.repository;

import app.adaplus.backend.entity.IslandInvite;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface IslandInviteRepository extends JpaRepository<IslandInvite, UUID> {

    Optional<IslandInvite> findByToken(String token);
    Optional<IslandInvite> findByEmail(String email);
    boolean existsByEmail(String email);
    long countBySentByIdAndUsedAtIsNotNull(UUID sentById);
}
