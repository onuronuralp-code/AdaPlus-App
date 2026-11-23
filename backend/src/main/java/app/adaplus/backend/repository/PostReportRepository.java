package app.adaplus.backend.repository;

import app.adaplus.backend.entity.Post;
import app.adaplus.backend.entity.PostReport;
import app.adaplus.backend.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.UUID;

public interface PostReportRepository extends JpaRepository<PostReport, UUID> {

    boolean existsByUserAndPost(User user, Post post);
    
    @Modifying
    @Query("DELETE FROM PostReport p WHERE p.post = :post")
    void deleteByPost(@Param("post") Post post);
}
