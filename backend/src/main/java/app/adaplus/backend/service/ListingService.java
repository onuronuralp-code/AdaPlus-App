package app.adaplus.backend.service;

import app.adaplus.backend.dto.activity.ReviewRequest;
import app.adaplus.backend.dto.listing.ListingDto;
import app.adaplus.backend.dto.listing.SaveListingRequest;
import app.adaplus.backend.entity.Listing;
import app.adaplus.backend.entity.ListingCategory;
import app.adaplus.backend.entity.NotificationType;
import app.adaplus.backend.entity.ReviewStatus;
import app.adaplus.backend.entity.Role;
import app.adaplus.backend.entity.User;
import app.adaplus.backend.exception.AlreadyReviewedException;
import app.adaplus.backend.exception.DailyLimitExceededException;
import app.adaplus.backend.exception.ResourceNotFoundException;
import app.adaplus.backend.exception.UnauthorizedException;

import app.adaplus.backend.repository.ListingRepository;
import app.adaplus.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import static app.adaplus.backend.entity.ReviewStatus.APPROVED;
import static app.adaplus.backend.entity.ReviewStatus.REJECTED;

import java.time.Instant;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.util.List;
import java.util.UUID;
import java.util.Objects;

@Service
@RequiredArgsConstructor
@Transactional
public class ListingService {

    @Value("${app.listing.monthly-limit:5}")
    private int monthlyLimit;

    private final ListingRepository listingRepository;
    private final UserRepository userRepository;
    private final PushNotificationService pushNotificationService;
    private final NotificationService notificationService;
    private final EmailService emailService;
    private final AdminTokenService adminTokenService;

    @Transactional(readOnly = true)
    public Page<ListingDto> getListings(ListingCategory category, int page, int size) {
        PageRequest pageable = PageRequest.of(page, size);
        Page<Listing> listings = category == null
                ? listingRepository.findByActiveTrueAndStatusOrderByCreatedAtDesc(ReviewStatus.APPROVED, pageable)
                : listingRepository.findByCategoryAndActiveTrueAndStatusOrderByCreatedAtDesc(category, ReviewStatus.APPROVED, pageable);
        return listings.map(ListingDto::from);
    }

    @Transactional(readOnly = true)
    public List<ListingDto> getUserListings(UUID userId) {
        return listingRepository.findBySubmittedByIdOrderByCreatedAtDesc(userId)
                .stream()
                .map(ListingDto::from)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<ListingDto> getPendingListings() {
        return listingRepository.findByStatus(ReviewStatus.PENDING)
                .stream()
                .map(ListingDto::from)
                .toList();
    }

    public ListingDto review(UUID id, ReviewRequest req) {
        if (req.decision() == REJECTED && (req.rejectionReason() == null || req.rejectionReason().isBlank())) {
            throw new IllegalArgumentException("Rejection reason is required when declining");
        }
        Listing listing = findOrThrow(id);
        if (listing.getStatus() != ReviewStatus.PENDING) {
            throw new AlreadyReviewedException(listing.getStatus());
        }
        listing.setStatus(req.decision());
        listing.setRejectionReason(req.decision() == REJECTED ? req.rejectionReason().trim() : null);
        ListingDto saved = ListingDto.from(listingRepository.save(listing));
        if (listing.getSubmittedBy() != null) {
            UUID submitterId = listing.getSubmittedBy().getId();
            UUID reviewerId = currentUserIdOptional();
            if (reviewerId == null || !submitterId.equals(reviewerId)) {
                String title;
                String body;
                if (req.decision() == APPROVED) {
                    title = "İlan Onaylandı";
                    body = "\"" + listing.getTitle() + "\" ilanınız onaylandı ve yayında!";
                } else {
                    title = "İlan Reddedildi";
                    body = "\"" + listing.getTitle() + "\" başvurunuz reddedildi. Sebep: " + req.rejectionReason().trim();
                }
                notificationService.push(submitterId, NotificationType.ACTIVITY, title, body, listing.getId());
                pushNotificationService.sendToUser(submitterId, title, body);
            }
        }
        return saved;
    }

    @Transactional(readOnly = true)
    public ListingDto getListing(UUID id) {
        return ListingDto.from(findOrThrow(id));
    }

    public ListingDto createListing(SaveListingRequest req) {
        User submitter = currentUser();
        if (submitter == null) {
            throw new UnauthorizedException("You must be logged in to create a listing");
        }
        if (submitter.getRole() != Role.ADMIN) {
            Instant startOfMonth = ZonedDateTime.now(ZoneId.of("Europe/Istanbul"))
                    .withDayOfMonth(1).toLocalDate().atStartOfDay(ZoneId.of("Europe/Istanbul")).toInstant();
            long count = listingRepository.countBySubmittedByIdAndCreatedAtAfter(submitter.getId(), startOfMonth);
            if (count >= monthlyLimit) {
                throw new DailyLimitExceededException("Bu ay " + monthlyLimit + " ilan limitine ulaştınız.");
            }
        }
        List<String> imageUrls = req.imageUrls() != null ? req.imageUrls() : List.of();
        Listing listing = Listing.builder()
                .title(req.title().trim())
                .description(req.description().trim())
                .category(req.category())
                .island(req.island())
                .price(req.price())
                .priceLabel(req.priceLabel())
                .imageUrl(imageUrls.isEmpty() ? null : imageUrls.get(0))
                .imageUrls(imageUrls)
                .contactInfo(req.contactInfo())
                .sellerName(req.sellerName())
                .active(req.active())
                .submittedBy(submitter)
                .build();
        Listing saved = listingRepository.save(listing);
        String token = adminTokenService.generateToken("listing", saved.getId());
        if (!token.isEmpty()) {
            String price = req.price() != null
                    ? req.price().toPlainString() + (req.priceLabel() != null ? " " + req.priceLabel() : "")
                    : "Belirtilmemiş";
            emailService.notifyAdminNewListing(
                    saved.getId().toString(),
                    saved.getTitle(),
                    saved.getCategory() != null ? saved.getCategory().name() : "—",
                    saved.getIsland() != null ? saved.getIsland().name() : "—",
                    price,
                    Objects.toString(saved.getContactInfo(), "—"),
                    Objects.toString(saved.getDescription(), ""),
                    submitter != null ? submitter.getFullName() : "Bilinmiyor",
                    submitter != null ? submitter.getEmail() : "",
                    token);
        }
        return ListingDto.from(saved);
    }

    public ListingDto updateListing(UUID id, SaveListingRequest req) {
        User user = currentUser();
        if (user == null) throw new UnauthorizedException("User not authenticated");
        
        Listing listing = findOrThrow(id);
        if (!listing.getSubmittedBy().getId().equals(user.getId()) && user.getRole() != Role.ADMIN) {
            throw new UnauthorizedException("You can only edit your own listings");
        }
        List<String> imageUrls = req.imageUrls() != null ? req.imageUrls() : List.of();
        listing.setTitle(req.title().trim());
        listing.setDescription(req.description().trim());
        listing.setCategory(req.category());
        listing.setIsland(req.island());
        listing.setPrice(req.price());
        listing.setPriceLabel(req.priceLabel());
        listing.setImageUrl(imageUrls.isEmpty() ? null : imageUrls.get(0));
        listing.setImageUrls(imageUrls);
        listing.setContactInfo(req.contactInfo());
        listing.setSellerName(req.sellerName());
        listing.setActive(req.active());
        
        if (user.getRole() != Role.ADMIN) {
            listing.setStatus(ReviewStatus.PENDING);
        }
        Listing saved = listingRepository.save(listing);
        
        if (user.getRole() != Role.ADMIN) {
            String token = adminTokenService.generateToken("listing", saved.getId());
            if (!token.isEmpty()) {
                String price = saved.getPrice() != null
                        ? saved.getPrice().toPlainString() + (saved.getPriceLabel() != null ? " " + saved.getPriceLabel() : "")
                        : "Belirtilmemiş";
                emailService.notifyAdminNewListing(
                        saved.getId().toString(),
                        saved.getTitle(),
                        saved.getCategory() != null ? saved.getCategory().name() : "—",
                        saved.getIsland() != null ? saved.getIsland().name() : "—",
                        price,
                        Objects.toString(saved.getContactInfo(), "—"),
                        Objects.toString(saved.getDescription(), ""),
                        user.getFullName(),
                        user.getEmail(),
                        token);
            }
        }
        return ListingDto.from(saved);
    }

    public void deleteListing(UUID id) {
        User user = currentUser();
        if (user == null) throw new UnauthorizedException("User not authenticated");
        
        Listing listing = findOrThrow(id);
        if (!listing.getSubmittedBy().getId().equals(user.getId()) && user.getRole() != Role.ADMIN) {
            throw new UnauthorizedException("You can only delete your own listings");
        }
        listingRepository.delete(listing);
    }

    private Listing findOrThrow(UUID id) {
        return listingRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Listing not found"));
    }

    private User currentUser() {
        Object principal = SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        if (principal instanceof String principalString) {
            if ("anonymousUser".equals(principalString)) return null;
            try {
                return userRepository.findById(UUID.fromString(principalString)).orElse(null);
            } catch (IllegalArgumentException e) {
                return null;
            }
        }
        return null;
    }

    private UUID currentUserIdOptional() {
        var auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated()) return null;
        try {
            return UUID.fromString(auth.getPrincipal().toString());
        } catch (IllegalArgumentException e) {
            return null;
        }
    }
}
