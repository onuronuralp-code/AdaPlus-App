package app.adaplus.backend.repository;

import app.adaplus.backend.entity.Post;
import app.adaplus.backend.entity.PostLike;
import app.adaplus.backend.entity.PostType;
import app.adaplus.backend.entity.Topic;
import app.adaplus.backend.entity.User;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public interface PostRepository extends JpaRepository<Post, UUID> {

    // Top-level posts feed — newest first (Tümü tab)
    Page<Post> findByParentPostIsNullOrderByCreatedAtDesc(Pageable pageable);

    // Ranked feed — kept for potential future use
    @Query(value = """
            SELECT p.* FROM posts p
            WHERE p.parent_id IS NULL
            ORDER BY (
                (SELECT COUNT(*) FROM post_likes l WHERE l.post_id = p.id) +
                (SELECT COUNT(*) FROM posts r WHERE r.parent_id = p.id) * 2.0
            ) / POWER(
                EXTRACT(EPOCH FROM (NOW() - p.created_at)) / 3600.0 + 2.0,
                1.5
            ) DESC
            """,
            countQuery = "SELECT COUNT(*) FROM posts WHERE parent_id IS NULL",
            nativeQuery = true)
    Page<Post> findRankedFeed(Pageable pageable);

    @Query(value = """
            SELECT p.* FROM posts p
            WHERE p.parent_id IS NULL AND p.post_type = :postType
            ORDER BY (
                (SELECT COUNT(*) FROM post_likes l WHERE l.post_id = p.id) +
                (SELECT COUNT(*) FROM posts r WHERE r.parent_id = p.id) * 2.0
            ) / POWER(
                EXTRACT(EPOCH FROM (NOW() - p.created_at)) / 3600.0 + 2.0,
                1.5
            ) DESC
            """,
            countQuery = "SELECT COUNT(*) FROM posts WHERE parent_id IS NULL AND post_type = :postType",
            nativeQuery = true)
    Page<Post> findRankedFeedByPostType(@Param("postType") String postType, Pageable pageable);

    Page<Post> findByParentPostIsNullAndTopicOrderByCreatedAtDesc(Topic topic, Pageable pageable);

    // Replies
    List<Post> findByParentPostOrderByCreatedAtAsc(Post parentPost);
    long countByParentPost(Post parentPost);

    // User section
    Page<Post> findByUserAndParentPostIsNullOrderByCreatedAtDesc(User user, Pageable pageable);
    Page<Post> findByUserAndParentPostIsNotNullOrderByCreatedAtDesc(User user, Pageable pageable);

    // Hot feed — Popüler tab: Sadece etkileşimi olanları en çoktan aza doğru sıralar
    @Query(value = """
            SELECT p.* FROM posts p
            WHERE p.parent_id IS NULL
            AND (
                (SELECT COUNT(*) FROM post_likes l WHERE l.post_id = p.id) > 0 OR
                (SELECT COUNT(*) FROM posts r WHERE r.parent_id = p.id) > 0
            )
            ORDER BY (
                (SELECT COUNT(*) FROM post_likes l WHERE l.post_id = p.id) +
                (SELECT COUNT(*) FROM posts r WHERE r.parent_id = p.id)
            ) DESC, p.created_at DESC
            """,
            countQuery = "SELECT COUNT(*) FROM posts p WHERE p.parent_id IS NULL AND ((SELECT COUNT(*) FROM post_likes l WHERE l.post_id = p.id) > 0 OR (SELECT COUNT(*) FROM posts r WHERE r.parent_id = p.id) > 0)",
            nativeQuery = true)
    List<Post> findHotPosts(Pageable pageable);
}
