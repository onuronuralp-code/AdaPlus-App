package app.adaplus.backend.repository;

import app.adaplus.backend.entity.Topic;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface TopicRepository extends JpaRepository<Topic, UUID> {

    boolean existsByNameIgnoreCase(String name);
    Optional<Topic> findByNameIgnoreCase(String name);
}
