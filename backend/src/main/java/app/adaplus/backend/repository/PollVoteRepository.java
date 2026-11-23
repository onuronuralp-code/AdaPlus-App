package app.adaplus.backend.repository;

import app.adaplus.backend.entity.PollOption;
import app.adaplus.backend.entity.PollVote;
import app.adaplus.backend.entity.Post;
import app.adaplus.backend.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;
import java.util.UUID;

public interface PollVoteRepository extends JpaRepository<PollVote, UUID> {

    long countByPollOption(PollOption pollOption);
    Optional<PollVote> findByUserAndPost(User user, Post post);
    boolean existsByUserAndPost(User user, Post post);

    @Modifying
    @Query("DELETE FROM PollVote v WHERE v.user = :user AND v.post = :post")
    void deleteByUserAndPost(@Param("user") User user, @Param("post") Post post);
    
    @Modifying
    @Query("DELETE FROM PollVote v WHERE v.post = :post")
    void deleteByPost(@Param("post") Post post);
}
