package app.adaplus.backend.repository;

import app.adaplus.backend.entity.Listing;
import app.adaplus.backend.entity.ListingCategory;
import app.adaplus.backend.entity.ReviewStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public interface ListingRepository extends JpaRepository<Listing, UUID> {

    Page<Listing> findByActiveTrueAndStatusOrderByCreatedAtDesc(ReviewStatus status, Pageable pageable);
    Page<Listing> findByCategoryAndActiveTrueAndStatusOrderByCreatedAtDesc(ListingCategory category, ReviewStatus status, Pageable pageable);
    List<Listing> findByStatus(ReviewStatus status);
    List<Listing> findBySubmittedByIdOrderByCreatedAtDesc(UUID submittedById);
    long countBySubmittedByIdAndCreatedAtAfter(UUID submittedById, Instant since);
}
