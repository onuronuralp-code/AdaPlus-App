package app.adaplus.backend.repository;

import app.adaplus.backend.entity.PollOption;
import app.adaplus.backend.entity.Post;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.UUID;

public interface PollOptionRepository extends JpaRepository<PollOption, UUID> {

    List<PollOption> findByPostOrderBySortOrderAsc(Post post);
    
    @Modifying
    @Query("DELETE FROM PollOption p WHERE p.post = :post")
    void deleteByPost(@Param("post") Post post);
}
