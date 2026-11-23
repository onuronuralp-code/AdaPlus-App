package app.adaplus.backend.service;

import app.adaplus.backend.dto.providerapplication.CreateServiceProviderApplicationRequest;
import app.adaplus.backend.dto.providerapplication.ReviewRequest;
import app.adaplus.backend.dto.providerapplication.ServiceProviderApplicationDto;
import app.adaplus.backend.entity.NotificationType;
import app.adaplus.backend.entity.ReviewStatus;
import app.adaplus.backend.entity.ServiceProviderApplication;
import app.adaplus.backend.entity.User;
import app.adaplus.backend.exception.AlreadyReviewedException;
import app.adaplus.backend.exception.ResourceNotFoundException;
import app.adaplus.backend.exception.UnauthorizedException;
import app.adaplus.backend.repository.ServiceProviderApplicationRepository;
import app.adaplus.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

import static app.adaplus.backend.entity.ReviewStatus.APPROVED;
import static app.adaplus.backend.entity.ReviewStatus.REJECTED;

@Service
@RequiredArgsConstructor
@Transactional
public class ServiceProviderApplicationService {

    private final ServiceProviderApplicationRepository applicationRepository;
    private final UserRepository userRepository;
    private final NotificationService notificationService;
    private final PushNotificationService pushNotificationService;

    public ServiceProviderApplicationDto submitApplication(CreateServiceProviderApplicationRequest req) {
        User submitter = currentUser();
        if (submitter == null) {
            throw new UnauthorizedException("You must be logged in to apply as a service provider");
        }
        ServiceProviderApplication application = ServiceProviderApplication.builder()
                .submittedBy(submitter)
                .fullName(req.fullName().trim())
                .phone(req.phone().trim())
                .island(req.island())
                .category(req.category())
                .offeredServices(req.offeredServices().trim())
                .experienceNotes(req.experienceNotes() != null ? req.experienceNotes().trim() : null)
                .build();
        return ServiceProviderApplicationDto.from(applicationRepository.save(application));
    }

    @Transactional(readOnly = true)
    public List<ServiceProviderApplicationDto> getMyApplications(UUID userId) {
        return applicationRepository.findBySubmittedByIdOrderByCreatedAtDesc(userId)
                .stream()
                .map(ServiceProviderApplicationDto::from)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<ServiceProviderApplicationDto> getPendingApplications() {
        return applicationRepository.findByStatusOrderByCreatedAtDesc(ReviewStatus.PENDING)
                .stream()
                .map(ServiceProviderApplicationDto::from)
                .toList();
    }

    public ServiceProviderApplicationDto review(UUID id, ReviewRequest req) {
        if (req.decision() == REJECTED && (req.rejectionReason() == null || req.rejectionReason().isBlank())) {
            throw new IllegalArgumentException("Rejection reason is required when declining");
        }
        ServiceProviderApplication application = findOrThrow(id);
        if (application.getStatus() != ReviewStatus.PENDING) {
            throw new AlreadyReviewedException(application.getStatus());
        }
        application.setStatus(req.decision());
        application.setRejectionReason(req.decision() == REJECTED ? req.rejectionReason().trim() : null);
        ServiceProviderApplicationDto saved = ServiceProviderApplicationDto.from(applicationRepository.save(application));

        User submitter = application.getSubmittedBy();
        String title;
        String body;
        if (req.decision() == APPROVED) {
            title = "Başvurunuz Onaylandı";
            body = "Yerel hizmet sağlayıcı başvurunuz onaylandı!";
        } else {
            title = "Başvurunuz Reddedildi";
            body = "Yerel hizmet sağlayıcı başvurunuz reddedildi. Sebep: " + req.rejectionReason().trim();
        }
        notificationService.push(submitter.getId(), NotificationType.SYSTEM, title, body, application.getId());
        pushNotificationService.sendToUser(submitter.getId(), title, body);

        return saved;
    }

    private ServiceProviderApplication findOrThrow(UUID id) {
        return applicationRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Service provider application not found"));
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
}
