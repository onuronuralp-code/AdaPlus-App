package app.adaplus.backend.controller;

import app.adaplus.backend.entity.EmailVerification;
import app.adaplus.backend.entity.PasswordReset;
import app.adaplus.backend.repository.EmailVerificationRepository;
import app.adaplus.backend.repository.PasswordResetRepository;
import app.adaplus.backend.repository.UserRepository;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import io.swagger.v3.oas.annotations.security.SecurityRequirements;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Profile;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.Instant;
import java.util.Map;

/**
 * DEV ONLY — never loaded in prod (Spring profile guard).
 * Exposes OTP and reset tokens directly so you can test auth flows
 * in Swagger without waiting for console logs.
 */
@RestController
@RequestMapping("/api/v1/dev")
@RequiredArgsConstructor
@Profile("dev")
@Tag(name = "Dev Tools", description = "DEV ONLY — not available in production.")
@SecurityRequirements
public class DevToolsController {

    private final UserRepository userRepository;
    private final EmailVerificationRepository emailVerificationRepository;
    private final PasswordResetRepository passwordResetRepository;

    @Operation(summary = "Get latest OTP for an email",
               description = "Returns the current verification code so you can test signup without checking the console.")
    @GetMapping("/otp")
    public Map<String, Object> getOtp(@RequestParam String email) {
        return userRepository.findByEmail(email.trim().toLowerCase())
                .flatMap(emailVerificationRepository::findTopByUserOrderByCreatedAtDesc)
                .map(ev -> Map.<String, Object>of(
                        "code", ev.getToken(),
                        "expiresAt", ev.getExpiresAt(),
                        "expired", ev.getExpiresAt().isBefore(Instant.now())
                ))
                .orElse(Map.of("error", "No pending verification found for " + email));
    }

    @Operation(summary = "Get latest password reset token for an email",
               description = "Returns the reset token so you can test forgot-password without checking the console.")
    @GetMapping("/reset-token")
    public Map<String, Object> getResetToken(@RequestParam String email) {
        return userRepository.findByEmail(email.trim().toLowerCase())
                .flatMap(passwordResetRepository::findTopByUserOrderByCreatedAtDesc)
                .map(pr -> Map.<String, Object>of(
                        "token", pr.getToken(),
                        "expiresAt", pr.getExpiresAt(),
                        "expired", pr.getExpiresAt().isBefore(Instant.now())
                ))
                .orElse(Map.of("error", "No pending reset token found for " + email));
    }
}
