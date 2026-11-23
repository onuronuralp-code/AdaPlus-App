package app.adaplus.backend.controller;

import app.adaplus.backend.BaseIntegrationTest;
import app.adaplus.backend.entity.EmailVerification;
import app.adaplus.backend.entity.Role;
import app.adaplus.backend.entity.User;
import app.adaplus.backend.repository.EmailVerificationRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;

import java.time.Instant;
import java.time.temporal.ChronoUnit;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

class AuthControllerTest extends BaseIntegrationTest {

    @Autowired
    private EmailVerificationRepository emailVerificationRepository;

    // ── Signup ──────────────────────────────────────────────────────────────

    @Test
    void signup_returns201_withValidRequest() throws Exception {
        mockMvc.perform(post("/api/v1/auth/signup")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"fullName":"Ali Yılmaz","email":"%s","password":"Password1!","kvkkAccepted":true}
                                """.formatted(uniqueEmail())))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.message").exists());
    }

    @Test
    void signup_returns400_whenNameBlank() throws Exception {
        mockMvc.perform(post("/api/v1/auth/signup")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"fullName":"","email":"%s","password":"Password1!","kvkkAccepted":true}
                                """.formatted(uniqueEmail())))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400));
    }

    @Test
    void signup_returns400_whenNameTooShort() throws Exception {
        mockMvc.perform(post("/api/v1/auth/signup")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"fullName":"A","email":"%s","password":"Password1!","kvkkAccepted":true}
                                """.formatted(uniqueEmail())))
                .andExpect(status().isBadRequest());
    }

    @Test
    void signup_returns400_whenNameTooLong() throws Exception {
        String longName = "A".repeat(101);
        mockMvc.perform(post("/api/v1/auth/signup")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"fullName":"%s","email":"%s","password":"Password1!","kvkkAccepted":true}
                                """.formatted(longName, uniqueEmail())))
                .andExpect(status().isBadRequest());
    }

    @Test
    void signup_returns400_whenNameContainsDigits() throws Exception {
        mockMvc.perform(post("/api/v1/auth/signup")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"fullName":"Ali123","email":"%s","password":"Password1!","kvkkAccepted":true}
                                """.formatted(uniqueEmail())))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value(org.hamcrest.Matchers.containsString("fullName")));
    }

    @Test
    void signup_returns400_whenEmailInvalid() throws Exception {
        mockMvc.perform(post("/api/v1/auth/signup")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"fullName":"Ali Yılmaz","email":"notanemail","password":"Password1!","kvkkAccepted":true}
                                """))
                .andExpect(status().isBadRequest());
    }

    @Test
    void signup_returns400_whenPasswordTooShort() throws Exception {
        mockMvc.perform(post("/api/v1/auth/signup")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"fullName":"Ali Yılmaz","email":"%s","password":"Short1!","kvkkAccepted":true}
                                """.formatted(uniqueEmail())))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value(org.hamcrest.Matchers.containsString("password")));
    }

    @Test
    void signup_returns400_whenPasswordTooLong() throws Exception {
        String longPassword = "A".repeat(73);
        mockMvc.perform(post("/api/v1/auth/signup")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"fullName":"Ali Yılmaz","email":"%s","password":"%s","kvkkAccepted":true}
                                """.formatted(uniqueEmail(), longPassword)))
                .andExpect(status().isBadRequest());
    }

    @Test
    void signup_returns400_whenKvkkFalse() throws Exception {
        mockMvc.perform(post("/api/v1/auth/signup")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"fullName":"Ali Yılmaz","email":"%s","password":"Password1!","kvkkAccepted":false}
                                """.formatted(uniqueEmail())))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value(org.hamcrest.Matchers.containsString("kvkkAccepted")));
    }

    @Test
    void signup_returns400_whenPayloadEmpty() throws Exception {
        mockMvc.perform(post("/api/v1/auth/signup")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void signup_returns409_whenEmailAlreadyVerified() throws Exception {
        String email = uniqueEmail();
        // Pre-create a verified account in the DB
        createUser(email, Role.USER);

        mockMvc.perform(post("/api/v1/auth/signup")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"fullName":"Ali Yılmaz","email":"%s","password":"Password1!","kvkkAccepted":true}
                                """.formatted(email)))
                .andExpect(status().isConflict());
    }

    // ── Login ────────────────────────────────────────────────────────────────

    @Test
    void login_returns200_withValidCredentials() throws Exception {
        String email = uniqueEmail();
        createUser(email, Role.USER);

        mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"email":"%s","password":"%s"}
                                """.formatted(email, TEST_PASSWORD)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.token").exists())
                .andExpect(jsonPath("$.user.email").value(email));
    }

    @Test
    void login_returns401_withWrongPassword() throws Exception {
        String email = uniqueEmail();
        createUser(email, Role.USER);

        mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"email":"%s","password":"WrongPass1!"}
                                """.formatted(email)))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void login_returns401_whenAccountNotVerified() throws Exception {
        String email = uniqueEmail();
        // Save an UNVERIFIED user directly
        userRepository.save(User.builder()
                .fullName("Unverified User")
                .email(email)
                .passwordHash(passwordEncoder.encode(TEST_PASSWORD))
                .role(Role.USER)
                .emailVerified(false)
                .kvkkAccepted(true)
                .build());

        mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"email":"%s","password":"%s"}
                                """.formatted(email, TEST_PASSWORD)))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void login_returns400_withBlankEmail() throws Exception {
        mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"email":"","password":"Password1!"}
                                """))
                .andExpect(status().isBadRequest());
    }

    @Test
    void login_returns400_withMissingPassword() throws Exception {
        mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"email":"user@test.com"}
                                """))
                .andExpect(status().isBadRequest());
    }

    // ── Refresh / Logout ─────────────────────────────────────────────────────

    @Test
    void refresh_returns401_withoutToken() throws Exception {
        mockMvc.perform(post("/api/v1/auth/refresh"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void refresh_returns200_withValidToken() throws Exception {
        User user = createUser(uniqueEmail(), Role.USER);

        mockMvc.perform(post("/api/v1/auth/refresh")
                        .header("Authorization", bearerToken(user)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.token").exists());
    }

    @Test
    void logout_returns401_withoutToken() throws Exception {
        mockMvc.perform(post("/api/v1/auth/logout"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void logout_invalidatesToken_subsequentRequestReturns401() throws Exception {
        User user = createUser(uniqueEmail(), Role.USER);
        String token = bearerToken(user);

        // Authenticated call before logout — should succeed
        mockMvc.perform(post("/api/v1/auth/refresh")
                        .header("Authorization", token))
                .andExpect(status().isOk());

        // Logout
        mockMvc.perform(post("/api/v1/auth/logout")
                        .header("Authorization", token))
                .andExpect(status().isOk());

        // Same token after logout — must be rejected (tokenVersion mismatch)
        mockMvc.perform(post("/api/v1/auth/refresh")
                        .header("Authorization", token))
                .andExpect(status().isUnauthorized());
    }

    // ── Forgot / Reset Password ──────────────────────────────────────────────

    @Test
    void forgotPassword_returns200_evenForUnknownEmail() throws Exception {
        mockMvc.perform(post("/api/v1/auth/forgot-password")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"email":"nobody@nowhere.com"}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message").exists());
    }

    @Test
    void resetPassword_returns400_withInvalidToken() throws Exception {
        mockMvc.perform(post("/api/v1/auth/reset-password")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"token":"invalid-token-xyz","newPassword":"NewPassword1!"}
                                """))
                .andExpect(status().isBadRequest());
    }

    @Test
    void resetPassword_returns400_whenNewPasswordTooShort() throws Exception {
        mockMvc.perform(post("/api/v1/auth/reset-password")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"token":"any","newPassword":"short"}
                                """))
                .andExpect(status().isBadRequest());
    }

    // ── Verify OTP ───────────────────────────────────────────────────────────

    @Test
    void verifyOtp_returns400_withWrongCode() throws Exception {
        String email = uniqueEmail();
        // Signup creates an unverified user and sends OTP; we call with a wrong code
        mockMvc.perform(post("/api/v1/auth/signup")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"fullName":"Ali Yılmaz","email":"%s","password":"Password1!","kvkkAccepted":true}
                                """.formatted(email)))
                .andExpect(status().isCreated());

        mockMvc.perform(post("/api/v1/auth/verify-otp")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"email":"%s","code":"000000"}
                                """.formatted(email)))
                .andExpect(status().isBadRequest());
    }

    @Test
    void verifyOtp_returns400_withExpiredCode() throws Exception {
        String email = uniqueEmail();
        User user = userRepository.save(User.builder()
                .fullName("Expire Test")
                .email(email)
                .passwordHash(passwordEncoder.encode(TEST_PASSWORD))
                .role(Role.USER)
                .emailVerified(false)
                .kvkkAccepted(true)
                .build());

        // Insert an already-expired OTP directly
        emailVerificationRepository.save(EmailVerification.builder()
                .user(user)
                .token("123456")
                .expiresAt(Instant.now().minus(1, ChronoUnit.HOURS))
                .build());

        mockMvc.perform(post("/api/v1/auth/verify-otp")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"email":"%s","code":"123456"}
                                """.formatted(email)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value(org.hamcrest.Matchers.containsString("expired")));
    }

    @Test
    void resendVerification_returns409_whenAlreadyVerified() throws Exception {
        String email = uniqueEmail();
        createUser(email, Role.USER); // emailVerified = true

        mockMvc.perform(post("/api/v1/auth/resend-verification")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"email":"%s"}
                                """.formatted(email)))
                .andExpect(status().isConflict());
    }
}
