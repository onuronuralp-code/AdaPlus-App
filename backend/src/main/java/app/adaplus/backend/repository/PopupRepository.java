package app.adaplus.backend.repository;

import app.adaplus.backend.entity.Popup;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface PopupRepository extends JpaRepository<Popup, UUID> {
    Optional<Popup> findFirstByActiveTrueOrderByCreatedAtDesc();
}
