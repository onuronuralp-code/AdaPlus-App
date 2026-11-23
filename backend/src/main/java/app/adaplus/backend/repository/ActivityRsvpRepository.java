package app.adaplus.backend.repository;

import app.adaplus.backend.entity.Activity;
import app.adaplus.backend.entity.ActivityRsvp;
import app.adaplus.backend.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;
import java.util.UUID;

public interface ActivityRsvpRepository extends JpaRepository<ActivityRsvp, UUID> {

    Optional<ActivityRsvp> findByUserAndActivity(User user, Activity activity);

    boolean existsByUserAndActivity(User user, Activity activity);

    long countByActivity(Activity activity);

    @Query("SELECT COUNT(r) > 0 FROM ActivityRsvp r WHERE r.user.id = :userId AND r.activity.id = :activityId")
    boolean existsByUserIdAndActivityId(@Param("userId") UUID userId, @Param("activityId") UUID activityId);

    @Query("SELECT COUNT(r) FROM ActivityRsvp r WHERE r.activity.id = :activityId")
    long countByActivityId(@Param("activityId") UUID activityId);
    
    @Modifying
    @Query("DELETE FROM ActivityRsvp r WHERE r.activity = :activity")
    void deleteByActivity(@Param("activity") Activity activity);
}
