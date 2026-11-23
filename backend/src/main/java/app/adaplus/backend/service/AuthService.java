package app.adaplus.backend.service;

import app.adaplus.backend.dto.auth.*;
import app.adaplus.backend.dto.user.UserProfileDto;
import app.adaplus.backend.entity.EmailVerification;
import app.adaplus.backend.entity.IslandInvite;
import app.adaplus.backend.entity.PasswordReset;
import app.adaplus.backend.entity.Role;
import app.adaplus.backend.entity.User;
import app.adaplus.backend.entity.UserType;
import app.adaplus.backend.exception.ConflictException;
import app.adaplus.backend.exception.InvalidTokenException;
import app.adaplus.backend.exception.UnauthorizedException;
import app.adaplus.backend.repository.EmailVerificationRepository;
import app.adaplus.backend.repository.IslandInviteRepository;
import app.adaplus.backend.repository.PasswordResetRepository;
import app.adaplus.backend.repository.UserRepository;
import app.adaplus.backend.security.JwtUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.Instant;
import java.time.LocalDate;
import java.time.format.DateTimeParseException;
import java.time.temporal.ChronoUnit;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Transactional
public class AuthService {

    private final UserRepository userRepository;
    private final EmailVerificationRepository emailVerificationRepository;
    private final PasswordResetRepository passwordResetRepository;
    private final IslandInviteRepository islandInviteRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;
    private final EmailService emailService;
    private final SmsService smsService;

    public void signup(SignupRequest req) {
        boolean hasEmail = req.email() != null && !req.email().isBlank();
        boolean hasPhone = req.phone() != null && !req.phone().isBlank();

        if (!hasEmail && !hasPhone) {
            throw new IllegalArgumentException("Provide at least email or phone");
        }

        if (hasEmail) {
            signupWithEmail(req);
        } else {
            signupWithPhone(req);
        }
    }

    private void signupWithEmail(SignupRequest req) {
        String email = req.email().trim().toLowerCase();
        String phone = (req.phone() != null && !req.phone().isBlank()) ? normalizePhone(req.phone()) : null;

        if (phone != null) {
            String finalPhone = phone;
            userRepository.findByPhone(finalPhone).ifPresent(existing -> {
                if (req.inviteToken() != null && !req.inviteToken().isBlank()) {
                    // Anyone with a valid invite (issued to their own email) could otherwise type in
                    // a stranger's phone number here and silently upgrade that stranger's account to
                    // ISLAND_RESIDENT. Require proof the signer actually owns this phone before it's
                    // allowed to identify — and mutate — someone else's account.
                    if (req.existingPhoneOtp() == null || !smsService.checkOtp(finalPhone, req.existingPhoneOtp())) {
                        throw new InvalidTokenException("Please verify the phone number you entered before continuing.");
                    }
                    IslandInvite invite = resolveInvite(req.inviteToken(), email);
                    if (existing.getUserType() != UserType.ISLAND_RESIDENT) {
                        existing.setUserType(UserType.ISLAND_RESIDENT);
                        userRepository.save(existing);
                        consumeInvite(invite);
                    }
                    throw new ConflictException(
                            "Bu telefon numarasıyla zaten bir hesap mevcut. Telefon numaranızla giriş yapın — ada sakini statünüz uygulandı.");
                }
                throw new ConflictException("An account with this phone number already exists");
            });
        }

        userRepository.findByEmail(email).ifPresent(existing -> {
            if (existing.isEmailVerified()) {
                if (req.inviteToken() != null && !req.inviteToken().isBlank()) {
                    throw new ConflictException(
                            "Bu e-posta adresiyle zaten bir hesap mevcut. Giriş yapın — ada sakini statünüz otomatik olarak uygulanacak.");
                }
                throw new ConflictException("An account with this email address already exists");
            }
            emailVerificationRepository.deleteByUser(existing);
            userRepository.delete(existing);
            userRepository.flush();
        });

        IslandInvite invite = resolveInvite(req.inviteToken(), email);
        UserType userType = invite != null ? UserType.ISLAND_RESIDENT : UserType.TOURIST;

        User user = User.builder()
                .fullName(req.fullName().trim())
                .email(email)
                .phone(phone)
                .passwordHash(passwordEncoder.encode(req.password()))
                .role(Role.USER)
                .userType(userType)
                .termsAccepted(req.termsAccepted())
                .kvkkAccepted(req.kvkkAccepted())
                .emailVerified(false)
                .birthDate(parseBirthDate(req.birthDate()))
                .island(req.island())
                .build();
        userRepository.save(user);

        consumeInvite(invite);
        sendOtpByEmail(user);
    }

    private void signupWithPhone(SignupRequest req) {
        String phone = normalizePhone(req.phone());

        userRepository.findByPhone(phone).ifPresent(existing -> {
            if (existing.isEmailVerified()) {
                throw new ConflictException("An account with this phone number already exists");
            }
            userRepository.delete(existing);
            userRepository.flush();
        });

        User user = User.builder()
                .fullName(req.fullName().trim())
                .phone(phone)
                .passwordHash(passwordEncoder.encode(req.password()))
                .role(Role.USER)
                .userType(UserType.TOURIST)
                .termsAccepted(req.termsAccepted())
                .kvkkAccepted(req.kvkkAccepted())
                .emailVerified(false)
                .birthDate(parseBirthDate(req.birthDate()))
                .island(req.island())
                .build();
        userRepository.save(user);

        // Twilio Verify handles OTP generation and delivery — no DB storage needed
        smsService.sendOtp(phone);
    }

    /**
     * Sends an OTP to a phone number entered on the invite-signup form's "I already have a
     * phone account" field — proves the signer actually owns it before signupWithEmail is
     * allowed to use that number to identify and upgrade someone else's account.
     */
    public void sendExistingPhoneOtp(String phone) {
        smsService.sendOtp(normalizePhone(phone));
    }

    public LoginResponse verifyOtp(VerifyOtpRequest req) {
        boolean hasEmail = req.email() != null && !req.email().isBlank();
        boolean hasPhone = req.phone() != null && !req.phone().isBlank();

        if (hasEmail == hasPhone) {
            throw new IllegalArgumentException("Provide either email or phone, not both and not neither");
        }

        User user;
        if (hasEmail) {
            String email = req.email().trim().toLowerCase();
            user = userRepository.findByEmail(email)
                    .orElseThrow(() -> new InvalidTokenException("Incorrect verification code"));

            EmailVerification ev = emailVerificationRepository
                    .findTopByUserOrderByCreatedAtDesc(user)
                    .orElseThrow(() -> new InvalidTokenException("Incorrect verification code"));

            if (ev.getExpiresAt().isBefore(Instant.now())) {
                emailVerificationRepository.delete(ev);
                throw new InvalidTokenException("Verification code has expired. Please request a new one.");
            }

            if (ev.getAttempts() >= MAX_OTP_ATTEMPTS) {
                emailVerificationRepository.delete(ev);
                throw new InvalidTokenException("Too many incorrect attempts. Please request a new code.");
            }

            if (!ev.getToken().equals(req.code())) {
                ev.setAttempts(ev.getAttempts() + 1);
                emailVerificationRepository.save(ev);
                throw new InvalidTokenException("Incorrect verification code");
            }

            user.setEmailVerified(true);
            userRepository.save(user);
            emailVerificationRepository.delete(ev);
        } else {
            String phone = normalizePhone(req.phone());
            user = userRepository.findByPhone(phone)
                    .orElseThrow(() -> new InvalidTokenException("No account found with that phone number"));

            if (user.isEmailVerified()) {
                throw new ConflictException("This account is already verified.");
            }

            boolean approved = smsService.checkOtp(phone, req.code());
            if (!approved) {
                throw new InvalidTokenException("Incorrect or expired verification code.");
            }

            user.setEmailVerified(true);
            user.setPhoneVerified(true);
            user = userRepository.save(user);
        }
        String token = jwtUtil.generateToken(user.getId(), user.getEmail(), user.getRole(), user.getTokenVersion());
        return new LoginResponse(token, profileDto(user));
    }

    public void resendVerification(ResendVerificationRequest req) {
        boolean hasEmail = req.email() != null && !req.email().isBlank();
        boolean hasPhone = req.phone() != null && !req.phone().isBlank();

        if (hasEmail == hasPhone) {
            throw new IllegalArgumentException("Provide either email or phone, not both and not neither");
        }

        if (hasEmail) {
            String email = req.email().trim().toLowerCase();
            User user = userRepository.findByEmail(email)
                    .orElseThrow(() -> new InvalidTokenException("No account found"));
            if (user.isEmailVerified()) {
                throw new ConflictException("This account is already verified. Please log in.");
            }
            emailVerificationRepository.deleteByUser(user);
            sendOtpByEmail(user);
        } else {
            String phone = normalizePhone(req.phone());
            User user = userRepository.findByPhone(phone)
                    .orElseThrow(() -> new InvalidTokenException("No account found"));
            if (user.isEmailVerified()) {
                throw new ConflictException("This account is already verified. Please log in.");
            }
            smsService.sendOtp(phone);
        }
    }

    public LoginResponse login(LoginRequest req) {
        boolean hasEmail = req.email() != null && !req.email().isBlank();
        boolean hasPhone = req.phone() != null && !req.phone().isBlank();

        if (hasEmail == hasPhone) {
            throw new IllegalArgumentException("Provide either email or phone, not both and not neither");
        }

        User user;
        if (hasEmail) {
            String email = req.email().trim().toLowerCase();
            user = userRepository.findByEmail(email)
                    .orElseThrow(() -> new UnauthorizedException("Invalid credentials"));
        } else {
            String phone = normalizePhone(req.phone());
            user = userRepository.findByPhone(phone)
                    .orElseThrow(() -> new UnauthorizedException("Invalid credentials"));
        }

        if (!passwordEncoder.matches(req.password(), user.getPasswordHash())) {
            throw new UnauthorizedException("Invalid credentials");
        }
        if (!user.isEmailVerified()) {
            throw new UnauthorizedException("Please verify your account before logging in");
        }

        // Auto-apply any pending invite for this email (handles: account created before invite was used)
        if (user.getEmail() != null && user.getUserType() != UserType.ISLAND_RESIDENT) {
            islandInviteRepository.findByEmail(user.getEmail())
                    .filter(inv -> !inv.isExpired() && !inv.isUsed())
                    .ifPresent(inv -> {
                        user.setUserType(UserType.ISLAND_RESIDENT);
                        userRepository.save(user);
                        inv.setUsedAt(Instant.now());
                        islandInviteRepository.save(inv);
                    });
        }

        String token = jwtUtil.generateToken(user.getId(), user.getEmail(), user.getRole(), user.getTokenVersion());
        return new LoginResponse(token, profileDto(user));
    }

    public void forgotPassword(ForgotPasswordRequest req) {
        String normalizedEmail = req.email().trim().toLowerCase();
        userRepository.findByEmail(normalizedEmail).ifPresent(user -> {
            passwordResetRepository.deleteByUser(user);

            String token = UUID.randomUUID().toString();
            PasswordReset pr = PasswordReset.builder()
                    .user(user)
                    .token(token)
                    .expiresAt(Instant.now().plus(1, ChronoUnit.HOURS))
                    .build();
            passwordResetRepository.save(pr);

            emailService.sendPasswordResetEmail(user.getEmail(), user.getFullName(), token);
        });
    }

    public void resetPassword(ResetPasswordRequest req) {
        PasswordReset pr = passwordResetRepository.findByToken(req.token())
                .orElseThrow(() -> new InvalidTokenException("Invalid or expired reset link"));

        if (pr.getExpiresAt().isBefore(Instant.now())) {
            passwordResetRepository.delete(pr);
            throw new InvalidTokenException("Reset link has expired. Please request a new one.");
        }

        User user = pr.getUser();
        user.setPasswordHash(passwordEncoder.encode(req.newPassword()));
        userRepository.save(user);
        passwordResetRepository.delete(pr);
    }

    public LoginResponse refresh(String userId) {
        User user = userRepository.findById(UUID.fromString(userId))
                .orElseThrow(() -> new UnauthorizedException("User not found"));
        String token = jwtUtil.generateToken(user.getId(), user.getEmail(), user.getRole(), user.getTokenVersion());
        return new LoginResponse(token, profileDto(user));
    }

    public void logout(UUID userId) {
        userRepository.findById(userId).ifPresent(user -> {
            user.setTokenVersion(user.getTokenVersion() + 1);
            userRepository.save(user);
        });
    }

    // ── Helpers ──────────────────────────────────────────────────────────────

    private static final SecureRandom SECURE_RANDOM = new SecureRandom();
    private static final int MAX_OTP_ATTEMPTS = 5;

    private UserProfileDto profileDto(User user) {
        long invitedCount = islandInviteRepository.countBySentByIdAndUsedAtIsNotNull(user.getId());
        return UserProfileDto.from(user, invitedCount);
    }

    private void sendOtpByEmail(User user) {
        String code = generateOtp();
        EmailVerification ev = EmailVerification.builder()
                .user(user)
                .token(code)
                .expiresAt(Instant.now().plus(15, ChronoUnit.MINUTES))
                .build();
        emailVerificationRepository.save(ev);
        emailService.sendVerificationEmail(user.getEmail(), user.getFullName(), code);
    }

    private String generateOtp() {
        return String.format("%06d", SECURE_RANDOM.nextInt(1_000_000));
    }

    private IslandInvite resolveInvite(String inviteToken, String email) {
        if (inviteToken == null || inviteToken.isBlank()) return null;
        IslandInvite invite = islandInviteRepository.findByToken(inviteToken)
                .orElseThrow(() -> new InvalidTokenException("Invalid or expired invite token"));
        if (!invite.getEmail().equalsIgnoreCase(email)) {
            throw new InvalidTokenException("This invite was issued for a different email address");
        }
        if (invite.isExpired() || invite.isUsed()) {
            throw new InvalidTokenException("This invite has already been used or has expired");
        }
        return invite;
    }

    private void consumeInvite(IslandInvite invite) {
        if (invite != null) {
            invite.setUsedAt(Instant.now());
            islandInviteRepository.save(invite);
        }
    }

    private String normalizePhone(String phone) {
        if (phone == null) return null;
        String digits = phone.trim().replaceAll("[\\s\\-()]", "");
        if (digits.startsWith("+")) return digits;
        if (digits.startsWith("00")) return "+" + digits.substring(2);
        if (digits.startsWith("0")) return "+90" + digits.substring(1); // Turkish local: 05xx → +905xx
        return "+90" + digits; // bare digits assumed Turkey
    }

    private LocalDate parseBirthDate(String birthDate) {
        if (birthDate == null || birthDate.isBlank()) return null;
        try {
            return LocalDate.parse(birthDate);
        } catch (DateTimeParseException e) {
            throw new IllegalArgumentException("birthDate must be in YYYY-MM-DD format");
        }
    }
}
