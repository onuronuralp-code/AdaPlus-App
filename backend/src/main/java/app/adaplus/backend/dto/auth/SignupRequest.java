package app.adaplus.backend.dto.auth;

import jakarta.validation.constraints.*;

public record SignupRequest(

        @NotBlank(message = "Full name is required")
        @Size(min = 2, max = 100, message = "Full name must be between 2 and 100 characters")
        @Pattern(regexp = "^[\\p{L} .'-]+$", message = "Full name can only contain letters, spaces, hyphens, apostrophes, and dots")
        String fullName,

        // Mutually exclusive — exactly one of email or phone must be present
        @Email(message = "Invalid email address")
        @Size(max = 255, message = "Email must not exceed 255 characters")
        String email,

        @Size(max = 20, message = "Phone number must not exceed 20 characters")
        String phone,

        @NotBlank(message = "Password is required")
        @Size(min = 8, max = 72, message = "Password must be between 8 and 72 characters")
        String password,

        @AssertTrue(message = "KVKK Aydınlatma Metni kabul edilmelidir")
        boolean kvkkAccepted,

        boolean termsAccepted,

        @Size(max = 36, message = "Invite token must not exceed 36 characters")
        String inviteToken,  // optional — presence grants ISLAND_RESIDENT userType

        String birthDate,    // optional, ISO date string YYYY-MM-DD

        @Pattern(regexp = "^(Büyükada|Heybeliada|Burgazada|Kınalıada)?$",
                 message = "Island must be one of: Büyükada, Heybeliada, Burgazada, Kınalıada")
        String island,       // optional, one of the 4 island display names

        // Required only when `phone` matches an existing account and `inviteToken` is
        // present — proves the signer actually owns that phone before it can be used to
        // upgrade someone else's account to ISLAND_RESIDENT. Sent via
        // POST /api/v1/auth/existing-phone/send-otp.
        @Pattern(regexp = "^\\d{6}$", message = "Verification code must be exactly 6 digits")
        String existingPhoneOtp
) {}
