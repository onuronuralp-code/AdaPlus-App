package app.adaplus.backend.service;

import app.adaplus.backend.entity.IslandInvite;
import app.adaplus.backend.entity.Role;
import app.adaplus.backend.entity.User;
import app.adaplus.backend.entity.UserType;
import java.util.Optional;
import app.adaplus.backend.exception.ConflictException;
import app.adaplus.backend.exception.UnauthorizedException;
import app.adaplus.backend.repository.IslandInviteRepository;
import app.adaplus.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Transactional
public class InviteService {

    private static final int MAX_INVITES_PER_RESIDENT = 3;

    private final IslandInviteRepository islandInviteRepository;
    private final UserRepository userRepository;
    private final EmailService emailService;

    public void sendInvite(String email) {
        User sender = currentUser();
        if (sender.getRole() != Role.ADMIN && sender.getUserType() != UserType.ISLAND_RESIDENT) {
            throw new UnauthorizedException("Only island residents can send invites");
        }

        if (sender.getRole() != Role.ADMIN
                && islandInviteRepository.countBySentByIdAndUsedAtIsNotNull(sender.getId()) >= MAX_INVITES_PER_RESIDENT) {
            throw new ConflictException("You have reached your invite quota (" + MAX_INVITES_PER_RESIDENT + "/" + MAX_INVITES_PER_RESIDENT + ")");
        }

        String normalizedEmail = email.trim().toLowerCase();

        // If the user already has an account, upgrade them directly and record the invite as used
        Optional<User> existingUser = userRepository.findByEmail(normalizedEmail);
        if (existingUser.isPresent()) {
            User user = existingUser.get();
            if (user.getUserType() == UserType.ISLAND_RESIDENT) {
                throw new ConflictException("This user is already an island resident");
            }
            user.setUserType(UserType.ISLAND_RESIDENT);
            userRepository.save(user);
            // Record the invite so the sender's invite counter increments correctly
            Instant now = Instant.now();
            islandInviteRepository.save(IslandInvite.builder()
                    .sentBy(sender)
                    .email(normalizedEmail)
                    .token(UUID.randomUUID().toString())
                    .expiresAt(now)
                    .usedAt(now)
                    .build());
            return;
        }

        if (islandInviteRepository.existsByEmail(normalizedEmail)) {
            throw new ConflictException("An invite has already been sent to this email address");
        }

        String token = UUID.randomUUID().toString();
        islandInviteRepository.save(IslandInvite.builder()
                .sentBy(sender)
                .email(normalizedEmail)
                .token(token)
                .expiresAt(Instant.now().plus(7, ChronoUnit.DAYS))
                .build());

        emailService.sendIslandInviteEmail(normalizedEmail, token);
    }

    private User currentUser() {
        String principal = (String) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        return userRepository.findById(UUID.fromString(principal))
                .orElseThrow(() -> new UnauthorizedException("User not found"));
    }
}
