package app.adaplus.backend.repository;

import app.adaplus.backend.entity.Activity;
import app.adaplus.backend.entity.ReviewStatus;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public interface ActivityRepository extends JpaRepository<Activity, UUID> {

    // "Still relevant" = hasn't ended yet (endDate in the future), or for events with no
    // explicit end date, hasn't started yet — otherwise a past event lingers forever on
    // the events page and home banners. Events with no dates at all can't expire, so they
    // stay listed (sorted after dated ones) until removed.
    @Query("SELECT a FROM Activity a WHERE a.status = :status " +
           "AND ((a.endDate IS NOT NULL AND a.endDate >= :now) OR (a.endDate IS NULL AND a.startDate >= :now) " +
           "OR (a.endDate IS NULL AND a.startDate IS NULL)) " +
           "ORDER BY a.startDate ASC")
    List<Activity> findActiveByStatusOrderByStartDateAsc(@Param("status") ReviewStatus status, @Param("now") Instant now);

    // Same "still relevant" rule as findActiveByStatusOrderByStartDateAsc above — events with
    // no explicit end date count as upcoming until they start, not forever.
    @Query("SELECT a FROM Activity a WHERE a.status = :status " +
           "AND ((a.endDate IS NOT NULL AND a.endDate >= :now) OR (a.endDate IS NULL AND a.startDate >= :now) " +
           "OR (a.endDate IS NULL AND a.startDate IS NULL)) " +
           "ORDER BY a.startDate ASC")
    List<Activity> findUpcomingByStatusOrderByStartDateAsc(@Param("status") ReviewStatus status, @Param("now") Instant now, Pageable pageable);
    List<Activity> findByStatus(ReviewStatus status);
    List<Activity> findBySubmittedByIdOrderByStartDateDesc(UUID submittedById);
}
