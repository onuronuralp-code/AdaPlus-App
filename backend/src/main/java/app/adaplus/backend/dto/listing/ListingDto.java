package app.adaplus.backend.dto.listing;

import app.adaplus.backend.entity.Island;
import app.adaplus.backend.entity.Listing;
import app.adaplus.backend.entity.ListingCategory;
import app.adaplus.backend.entity.ReviewStatus;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record ListingDto(
        UUID id,
        String title,
        String description,
        ListingCategory category,
        Island island,
        BigDecimal price,
        String priceLabel,
        String imageUrl,
        List<String> imageUrls,
        String contactInfo,
        String sellerName,
        boolean active,
        ReviewStatus status,
        String rejectionReason,
        UUID submittedById,
        Instant createdAt,
        Instant updatedAt
) {
    public static ListingDto from(Listing l) {
        List<String> urls = l.getImageUrls() != null && !l.getImageUrls().isEmpty()
                ? l.getImageUrls()
                : (l.getImageUrl() != null ? List.of(l.getImageUrl()) : List.of());

        String primaryImage = !urls.isEmpty() ? urls.get(0) : l.getImageUrl();

        return new ListingDto(
                l.getId(),
                l.getTitle(),
                l.getDescription(),
                l.getCategory(),
                l.getIsland(),
                l.getPrice(),
                l.getPriceLabel(),
                primaryImage,
                urls,
                l.getContactInfo(),
                l.getSellerName(),
                l.isActive(),
                l.getStatus(),
                l.getRejectionReason(),
                l.getSubmittedBy() != null ? l.getSubmittedBy().getId() : null,
                l.getCreatedAt(),
                l.getUpdatedAt()
        );
    }
}
