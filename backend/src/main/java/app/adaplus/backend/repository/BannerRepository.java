package app.adaplus.backend.repository;

import app.adaplus.backend.entity.Banner;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface BannerRepository extends JpaRepository<Banner, UUID> {
    Optional<Banner> findFirstByActiveTrueOrderByCreatedAtDesc();
}
