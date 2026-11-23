package app.adaplus.backend.service;

import app.adaplus.backend.dto.user.SendEmailOtpRequest;
import app.adaplus.backend.dto.user.SendPhoneOtpRequest;
import app.adaplus.backend.dto.user.UpdateUserRequest;
import app.adaplus.backend.dto.user.UserProfileDto;
import app.adaplus.backend.dto.user.VerifyEmailRequest;
import app.adaplus.backend.dto.user.VerifyPhoneRequest;
import app.adaplus.backend.entity.EmailVerification;
import app.adaplus.backend.entity.Role;
import app.adaplus.backend.entity.User;
import app.adaplus.backend.exception.ConflictException;
import app.adaplus.backend.exception.InvalidTokenException;
import app.adaplus.backend.exception.ResourceNotFoundException;
import app.adaplus.backend.repository.EmailVerificationRepository;
import app.adaplus.backend.repository.IslandInviteRepository;
import app.adaplus.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Transactional
public class UserService {

    private static final SecureRandom SECURE_RANDOM = new SecureRandom();
    private static final int MAX_OTP_ATTEMPTS = 5;

    private final UserRepository userRepository;
    private final IslandInviteRepository islandInviteRepository;
    private final EmailVerificationRepository emailVerificationRepository;
    private final SmsService smsService;
    private final EmailService emailService;

    @Transactional(readOnly = true)
    public UserProfileDto getProfile(UUID userId) {
        User user = findOrThrow(userId);
        long invitedCount = islandInviteRepository.countBySentByIdAndUsedAtIsNotNull(userId);
        return UserProfileDto.from(user, invitedCount);
    }

    @Transactional(readOnly = true)
    public long getUserCount() {
        return userRepository.count();
    }

    public UserProfileDto updateProfile(UUID userId, UpdateUserRequest req) {
        User user = findOrThrow(userId);
        user.setFullName(req.fullName().trim());
        user.setAddress(req.address() != null ? req.address().trim() : null);
        return UserProfileDto.from(userRepository.save(user));
    }

    /**
     * Sends an OTP to a candidate email address to attach to the caller's account —
     * mirrors sendPhoneOtp, but since there's no Twilio-Verify-style external service for
     * email, the code is generated and stored here (EmailVerification.pendingEmail).
     * Only usable while the account has no email yet.
     */
    public void sendEmailOtp(UUID userId, SendEmailOtpRequest req) {
        User user = findOrThrow(userId);
        if (user.getEmail() != null) {
            throw new ConflictException("This account already has an email address");
        }
        String email = req.email().trim().toLowerCase();
        userRepository.findByEmail(email).ifPresent(existing -> {
            if (!existing.getId().equals(userId)) {
                throw new ConflictException("This email address is already linked to another account");
            }
        });

        emailVerificationRepository.deleteByUser(user);
        String code = String.format("%06d", SECURE_RANDOM.nextInt(1_000_000));
        emailVerificationRepository.save(EmailVerification.builder()
                .user(user)
                .token(code)
                .pendingEmail(email)
                .expiresAt(Instant.now().plus(15, ChronoUnit.MINUTES))
                .build());
        emailService.sendAddEmailVerification(email, user.getFullName(), code);
    }

    public UserProfileDto verifyEmail(UUID userId, VerifyEmailRequest req) {
        User user = findOrThrow(userId);
        if (user.getEmail() != null) {
            throw new ConflictException("This account already has an email address");
        }
        String email = req.email().trim().toLowerCase();

        EmailVerification ev = emailVerificationRepository.findTopByUserOrderByCreatedAtDesc(user)
                .orElseThrow(() -> new InvalidTokenException("Incorrect verification code"));

        if (ev.getExpiresAt().isBefore(Instant.now())) {
            emailVerificationRepository.delete(ev);
            throw new InvalidTokenException("Verification code has expired. Please request a new one.");
        }
        if (ev.getAttempts() >= MAX_OTP_ATTEMPTS) {
            emailVerificationRepository.delete(ev);
            throw new InvalidTokenException("Too many incorrect attempts. Please request a new code.");
        }
        if (ev.getPendingEmail() == null || !ev.getPendingEmail().equalsIgnoreCase(email)
                || !ev.getToken().equals(req.code())) {
            ev.setAttempts(ev.getAttempts() + 1);
            emailVerificationRepository.save(ev);
            throw new InvalidTokenException("Incorrect verification code");
        }

        userRepository.findByEmail(email).ifPresent(existing -> {
            if (!existing.getId().equals(userId)) {
                throw new ConflictException("This email address is already linked to another account");
            }
        });

        user.setEmail(email);
        emailVerificationRepository.delete(ev);
        return UserProfileDto.from(userRepository.save(user));
    }

    /**
     * Attaches (or re-attaches) a phone number to the caller's existing account and starts
     * OTP verification — lets an email-registered user pass the phone-verification gate
     * required to post on the forum, without going through signup again.
     */
    public void sendPhoneOtp(UUID userId, SendPhoneOtpRequest req) {
        User user = findOrThrow(userId);
        String phone = normalizePhone(req.phone());

        userRepository.findByPhone(phone).ifPresent(existing -> {
            if (!existing.getId().equals(userId)) {
                throw new ConflictException("phone_already_linked");
            }
        });

        smsService.sendOtp(phone);
    }

    public UserProfileDto verifyPhone(UUID userId, VerifyPhoneRequest req) {
        User user = findOrThrow(userId);
        String phone = normalizePhone(req.phone());

        userRepository.findByPhone(phone).ifPresent(existing -> {
            if (!existing.getId().equals(userId)) {
                throw new ConflictException("phone_already_linked");
            }
        });

        if (!smsService.checkOtp(phone, req.code())) {
            throw new InvalidTokenException("otp_incorrect_or_expired");
        }

        user.setPhone(phone);
        user.setPhoneVerified(true);
        return UserProfileDto.from(userRepository.save(user));
    }

    private String normalizePhone(String phone) {
        String digits = phone.trim().replaceAll("[\\s\\-()]", "");
        if (digits.startsWith("+")) return digits;
        if (digits.startsWith("00")) return "+" + digits.substring(2);
        if (digits.startsWith("0")) return "+90" + digits.substring(1); // Turkish local: 05xx → +905xx
        return "+90" + digits; // bare digits assumed Turkey
    }

    public void deleteAccount(UUID userId) {
        userRepository.delete(findOrThrow(userId));
    }

    public void deleteUserAsAdmin(UUID userId) {
        User user = findOrThrow(userId);
        if (user.getRole() == Role.ADMIN) {
            throw new ConflictException("Admin accounts cannot be deleted via this endpoint");
        }
        userRepository.delete(user);
    }

    private User findOrThrow(UUID userId) {
        return userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
    }
}
