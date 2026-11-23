package app.adaplus.backend.dto.user;

import app.adaplus.backend.entity.User;

import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

public record UserProfileDto(
        UUID id,
        String fullName,
        String email,
        String phone,
        boolean phoneVerified,
        String role,
        String userType,
        LocalDate birthDate,
        String island,
        String address,
        Instant createdAt,
        long invitedUsersCount
) {
    public static UserProfileDto from(User user) {
        return from(user, 0L);
    }

    public static UserProfileDto from(User user, long invitedUsersCount) {
        return new UserProfileDto(
                user.getId(),
                user.getFullName(),
                user.getEmail(),
                user.getPhone(),
                user.isPhoneVerified(),
                user.getRole().name(),
                user.getUserType().name(),
                user.getBirthDate(),
                user.getIsland(),
                user.getAddress(),
                user.getCreatedAt(),
                invitedUsersCount
        );
    }
}
