package app.adaplus.backend.repository;

import app.adaplus.backend.entity.Post;
import app.adaplus.backend.entity.PostLike;
import app.adaplus.backend.entity.User;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;
import java.util.UUID;

public interface PostLikeRepository extends JpaRepository<PostLike, UUID> {

    Optional<PostLike> findByUserAndPost(User user, Post post);
    boolean existsByUserAndPost(User user, Post post);
    long countByPost(Post post);
    Page<PostLike> findByUserOrderByCreatedAtDesc(User user, Pageable pageable);
    
    @Modifying
    @Query("DELETE FROM PostLike p WHERE p.post = :post")
    void deleteByPost(@Param("post") Post post);
}
