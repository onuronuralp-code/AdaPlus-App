package app.adaplus.backend.dto.providerapplication;

import app.adaplus.backend.entity.Island;
import app.adaplus.backend.entity.ReviewStatus;
import app.adaplus.backend.entity.ServiceCategory;
import app.adaplus.backend.entity.ServiceProviderApplication;

import java.time.Instant;
import java.util.UUID;

public record ServiceProviderApplicationDto(
        UUID id,
        String fullName,
        String phone,
        Island island,
        ServiceCategory category,
        String offeredServices,
        String experienceNotes,
        ReviewStatus status,
        String rejectionReason,
        Instant createdAt
) {
    public static ServiceProviderApplicationDto from(ServiceProviderApplication a) {
        return new ServiceProviderApplicationDto(
                a.getId(),
                a.getFullName(),
                a.getPhone(),
                a.getIsland(),
                a.getCategory(),
                a.getOfferedServices(),
                a.getExperienceNotes(),
                a.getStatus(),
                a.getRejectionReason(),
                a.getCreatedAt());
    }
}
