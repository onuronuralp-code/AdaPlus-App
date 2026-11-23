package app.adaplus.backend.repository;

import app.adaplus.backend.entity.ChatMessage;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.UUID;

public interface ChatMessageRepository extends JpaRepository<ChatMessage, UUID> {

    List<ChatMessage> findByUserIdOrderByCreatedAtDesc(UUID userId);

    long countByUserIdAndCreatedAtBetween(UUID userId, java.time.Instant from, java.time.Instant to);

    /** Top questions asked across all users — for analytics / RAG improvement. */
    @Query("SELECT c.message FROM ChatMessage c ORDER BY c.createdAt DESC")
    List<String> findAllMessagesOrderByCreatedAtDesc();

    @Query("SELECT c.island, COUNT(c) FROM ChatMessage c WHERE c.island IS NOT NULL GROUP BY c.island ORDER BY COUNT(c) DESC")
    List<Object[]> countByIsland();
}
