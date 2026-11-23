package app.adaplus.backend.seeder;

import app.adaplus.backend.entity.Role;
import app.adaplus.backend.entity.User;
import app.adaplus.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component
@ConditionalOnProperty(name = "app.admin.seed.enabled", havingValue = "true")
@RequiredArgsConstructor
public class AdminSeeder implements ApplicationRunner {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @Value("${app.admin.seed.password}")
    private String adminPassword;

    @Value("${app.admin.seed.email:admin@adaplus.com}")
    private String adminEmail;

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        if (adminPassword == null || adminPassword.isBlank()) {
            throw new IllegalStateException("ADMIN_SEED_PASSWORD must be set when admin seeding is enabled");
        }
        userRepository.findByEmail(adminEmail).ifPresentOrElse(
            existing -> {
                existing.setPasswordHash(passwordEncoder.encode(adminPassword));
                existing.setRole(Role.ADMIN);
                existing.setEmailVerified(true);
                userRepository.save(existing);
                System.out.println("Admin password synced: " + adminEmail);
            },
            () -> {
                User admin = User.builder()
                        .fullName("AdaPlus Admin")
                        .email(adminEmail)
                        .passwordHash(passwordEncoder.encode(adminPassword))
                        .role(Role.ADMIN)
                        .emailVerified(true)
                        .build();
                userRepository.save(admin);
                System.out.println("Admin user created: " + adminEmail);
            }
        );
    }
}
