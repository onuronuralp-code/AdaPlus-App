package app.adaplus.backend.service;

import app.adaplus.backend.dto.activity.ActivityDto;
import app.adaplus.backend.dto.activity.CreateActivityRequest;
import app.adaplus.backend.dto.activity.ReviewRequest;
import app.adaplus.backend.dto.activity.RsvpResponse;
import app.adaplus.backend.dto.activity.UpdateActivityRequest;
import app.adaplus.backend.entity.Activity;
import app.adaplus.backend.entity.ActivityRsvp;
import app.adaplus.backend.entity.NotificationType;
import app.adaplus.backend.entity.ReviewStatus;
import app.adaplus.backend.entity.Role;
import app.adaplus.backend.entity.User;
import app.adaplus.backend.exception.AlreadyReviewedException;
import app.adaplus.backend.exception.ResourceNotFoundException;
import app.adaplus.backend.exception.UnauthorizedException;
import org.springframework.security.access.AccessDeniedException;

import app.adaplus.backend.repository.ActivityRepository;
import app.adaplus.backend.repository.ActivityRsvpRepository;
import app.adaplus.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.PageRequest;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import static app.adaplus.backend.entity.ReviewStatus.APPROVED;
import static app.adaplus.backend.entity.ReviewStatus.REJECTED;

import java.time.Instant;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Transactional
public class ActivityService {

    private final ActivityRepository activityRepository;
    private final ActivityRsvpRepository activityRsvpRepository;
    private final UserRepository userRepository;
    private final PushNotificationService pushNotificationService;
    private final NotificationService notificationService;
    private final EmailService emailService;
    private final AdminTokenService adminTokenService;

    private static final DateTimeFormatter DATE_FMT =
            DateTimeFormatter.ofPattern("d MMM yyyy HH:mm").withZone(ZoneId.of("Europe/Istanbul"));

    @Transactional(readOnly = true)
    public List<ActivityDto> getAllActivities() {
        return activityRepository.findActiveByStatusOrderByStartDateAsc(ReviewStatus.APPROVED, Instant.now())
                .stream()
                .map(this::mapToDto)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<ActivityDto> getUpcomingActivities(int limit) {
        return activityRepository
                .findUpcomingByStatusOrderByStartDateAsc(
                        ReviewStatus.APPROVED, Instant.now(), PageRequest.of(0, limit))
                .stream()
                .map(this::mapToDto)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<ActivityDto> getUserActivities(UUID userId) {
        return activityRepository.findBySubmittedByIdOrderByStartDateDesc(userId)
                .stream()
                .map(this::mapToDto)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<ActivityDto> getPendingActivities() {
        return activityRepository.findByStatus(ReviewStatus.PENDING)
                .stream()
                .map(this::mapToDto)
                .toList();
    }

    public ActivityDto review(UUID id, ReviewRequest req) {
        if (req.decision() == REJECTED && (req.rejectionReason() == null || req.rejectionReason().isBlank())) {
            throw new IllegalArgumentException("Rejection reason is required when declining");
        }
        Activity activity = findOrThrow(id);
        if (activity.getStatus() != ReviewStatus.PENDING) {
            throw new AlreadyReviewedException(activity.getStatus());
        }
        activity.setStatus(req.decision());
        activity.setRejectionReason(req.decision() == REJECTED ? req.rejectionReason().trim() : null);
        ActivityDto saved = ActivityDto.from(activityRepository.save(activity));
        if (activity.getSubmittedBy() != null) {
            User submitter = activity.getSubmittedBy();
            UUID reviewerId = currentUserIdOptional();
            if (reviewerId == null || !submitter.getId().equals(reviewerId)) {
                String title;
                String body;
                if (req.decision() == APPROVED) {
                    title = "Etkinlik Onaylandı";
                    body = "\"" + displayName(activity) + "\" etkinliğiniz onaylandı ve yayında!";
                } else {
                    title = "Etkinlik Reddedildi";
                    body = "\"" + displayName(activity) + "\" başvurunuz reddedildi. Sebep: " + req.rejectionReason().trim();
                }
                notificationService.push(submitter.getId(), NotificationType.ACTIVITY, title, body, activity.getId());
                pushNotificationService.sendToUser(submitter.getId(), title, body);
            }
        }
        return saved;
    }

    @Transactional(readOnly = true)
    public ActivityDto getActivity(UUID id) {
        Activity activity = findOrThrow(id);
        long rsvpCount = activityRsvpRepository.countByActivityId(id);
        UUID currentUserId = currentUserIdOptional();
        boolean userHasRsvp = currentUserId != null
                && activityRsvpRepository.existsByUserIdAndActivityId(currentUserId, id);
        return ActivityDto.from(activity, rsvpCount, userHasRsvp);
    }

    public RsvpResponse toggleRsvp(UUID activityId) {
        User user = currentUser();
        Activity activity = findOrThrow(activityId);

        boolean going;
        try {
            Optional<ActivityRsvp> existing = activityRsvpRepository.findByUserAndActivity(user, activity);
            if (existing.isPresent()) {
                activityRsvpRepository.delete(existing.get());
                going = false;
            } else {
                activityRsvpRepository.saveAndFlush(
                        ActivityRsvp.builder().user(user).activity(activity).build());
                going = true;
            }
        } catch (DataIntegrityViolationException e) {
            // concurrent double-tap: record already exists, treat as going
            going = true;
        }

        long rsvpCount = activityRsvpRepository.countByActivity(activity);
        return new RsvpResponse(going, rsvpCount);
    }

    public ActivityDto createActivity(CreateActivityRequest req) {
        if (req.startDate() != null && req.endDate() != null && req.endDate().isBefore(req.startDate())) {
            throw new IllegalArgumentException("End date must be after start date");
        }
        User submitter = currentUser();
        if (submitter == null) {
            throw new UnauthorizedException("You must be logged in to create an activity");
        }
        Activity activity = Activity.builder()
                .name(trimToNull(req.name()))
                .description(trimToNull(req.description()))
                .startDate(req.startDate())
                .endDate(req.endDate())
                .organizerName(trimToNull(req.organizerName()))
                .organizerContact(trimToNull(req.organizerContact()))
                .eventPlace(trimToNull(req.eventPlace()))
                .instagramLink(trimToNull(req.instagramLink()))
                .imageUrl(trimToNull(req.imageUrl()))
                .island(req.island())
                .submittedBy(submitter)
                .build();

        Activity saved = activityRepository.save(activity);
        String token = adminTokenService.generateToken("activity", saved.getId());
        if (!token.isEmpty()) {
            emailService.notifyAdminNewActivity(
                    saved.getId().toString(),
                    displayName(saved),
                    saved.getOrganizerName() != null ? saved.getOrganizerName() : "Belirtilmemiş",
                    saved.getStartDate() != null ? DATE_FMT.format(saved.getStartDate()) : "Belirtilmemiş",
                    saved.getEndDate() != null ? DATE_FMT.format(saved.getEndDate()) : "Belirtilmemiş",
                    saved.getEventPlace() != null ? saved.getEventPlace() : "—",
                    saved.getDescription() != null ? saved.getDescription() : "",
                    submitter != null ? submitter.getFullName() : "Bilinmiyor",
                    submitter != null ? submitter.getEmail() : "",
                    token);
        }
        return ActivityDto.from(saved);
    }

    public ActivityDto updateActivity(UUID id, UpdateActivityRequest req) {
        if (req.startDate() != null && req.endDate() != null && req.endDate().isBefore(req.startDate())) {
            throw new IllegalArgumentException("End date must be after start date");
        }
        User user = currentUser();
        if (user == null) throw new UnauthorizedException("User not authenticated");
        
        Activity activity = findOrThrow(id);
        if (!activity.getSubmittedBy().getId().equals(user.getId()) && user.getRole() != Role.ADMIN) {
            throw new UnauthorizedException("You can only edit your own activities");
        }
        activity.setName(trimToNull(req.name()));
        activity.setDescription(trimToNull(req.description()));
        activity.setStartDate(req.startDate());
        activity.setEndDate(req.endDate());
        activity.setOrganizerName(trimToNull(req.organizerName()));
        activity.setOrganizerContact(trimToNull(req.organizerContact()));
        activity.setEventPlace(trimToNull(req.eventPlace()));
        activity.setInstagramLink(trimToNull(req.instagramLink()));
        activity.setImageUrl(trimToNull(req.imageUrl()));
        activity.setIsland(req.island());
        
        if (user.getRole() != Role.ADMIN) {
            activity.setStatus(ReviewStatus.PENDING);
        }

        Activity saved = activityRepository.save(activity);
        
        if (user.getRole() != Role.ADMIN) {
            String token = adminTokenService.generateToken("activity", saved.getId());
            if (!token.isEmpty()) {
                emailService.notifyAdminNewActivity(
                        saved.getId().toString(),
                        displayName(saved),
                        saved.getOrganizerName() != null ? saved.getOrganizerName() : "Belirtilmemiş",
                        saved.getStartDate() != null ? DATE_FMT.format(saved.getStartDate()) : "Belirtilmemiş",
                        saved.getEndDate() != null ? DATE_FMT.format(saved.getEndDate()) : "Belirtilmemiş",
                        saved.getEventPlace() != null ? saved.getEventPlace() : "—",
                        saved.getDescription() != null ? saved.getDescription() : "",
                        user.getFullName(),
                        user.getEmail(),
                        token);
            }
        }
        return ActivityDto.from(saved);
    }

    public void deleteActivity(UUID id) {
        User user = currentUser();
        if (user == null) throw new UnauthorizedException("User not authenticated");
        
        Activity activity = findOrThrow(id);
        if (!activity.getSubmittedBy().getId().equals(user.getId()) && user.getRole() != Role.ADMIN) {
            throw new AccessDeniedException("You can only delete your own activities");
        }
        
        activityRsvpRepository.deleteByActivity(activity);
        
        activityRepository.delete(activity);
    }

    private static String trimToNull(String s) {
        return s == null || s.isBlank() ? null : s.trim();
    }

    private static String displayName(Activity activity) {
        return activity.getName() != null ? activity.getName() : "Etkinlik";
    }

    private Activity findOrThrow(UUID id) {
        return activityRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Activity not found"));
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


    private ActivityDto mapToDto(Activity activity) {
        long rsvpCount = activityRsvpRepository.countByActivityId(activity.getId());
        UUID currentUserId = currentUserIdOptional();
        boolean userHasRsvp = currentUserId != null
                && activityRsvpRepository.existsByUserIdAndActivityId(currentUserId, activity.getId());
        return ActivityDto.from(activity, rsvpCount, userHasRsvp);
    }

    private UUID currentUserIdOptional() {
        var auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated()) return null;
        Object principal = auth.getPrincipal();
        if (!(principal instanceof String p)) return null;
        try {
            return UUID.fromString(p);
        } catch (IllegalArgumentException e) {
            return null;
        }
    }
}
