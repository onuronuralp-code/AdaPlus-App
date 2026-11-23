package app.adaplus.backend.controller;

import app.adaplus.backend.dto.auth.*;
import app.adaplus.backend.repository.IslandInviteRepository;
import app.adaplus.backend.service.AuthService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.security.SecurityRequirements;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.Map;

@RestController
@RequestMapping("/api/v1/auth")
@RequiredArgsConstructor
@Tag(name = "Auth", description = "Registration, login, email verification, and password reset")
@SecurityRequirements  // most auth endpoints are public; /refresh requires a valid JWT
public class AuthController {

    private final AuthService authService;
    private final IslandInviteRepository islandInviteRepository;

    @Operation(summary = "Look up invite email by token",
               description = "Returns the email address associated with a valid invite token. Used to prefill the signup form.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Email returned"),
            @ApiResponse(responseCode = "404", description = "Token not found, expired, or already used")
    })
    @GetMapping("/invite")
    public Map<String, String> getInviteEmail(@RequestParam String token) {
        return islandInviteRepository.findByToken(token)
                .filter(inv -> !inv.isExpired() && !inv.isUsed())
                .map(inv -> Map.of("email", inv.getEmail()))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Invite not found or expired"));
    }

    @Operation(summary = "Send OTP to an existing-phone-account claim on the signup form",
               description = "Sends a verification code to a phone number entered in the invite-signup form's " +
                              "\"I already have a phone account\" field. Required before that phone can be used " +
                              "to identify and upgrade an existing account to ISLAND_RESIDENT.")
    @ApiResponses({
            @ApiResponse(responseCode = "204", description = "OTP sent"),
            @ApiResponse(responseCode = "400", description = "Validation error")
    })
    @PostMapping("/existing-phone/send-otp")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void sendExistingPhoneOtp(@Valid @RequestBody SendExistingPhoneOtpRequest req) {
        authService.sendExistingPhoneOtp(req.phone());
    }

    @Operation(summary = "Register a new user",
               description = "Creates an unverified account and sends a 6-digit OTP to the provided email.")
    @ApiResponses({
            @ApiResponse(responseCode = "201", description = "Account created, OTP sent"),
            @ApiResponse(responseCode = "400", description = "Validation error"),
            @ApiResponse(responseCode = "409", description = "Email already registered")
    })
    @PostMapping("/signup")
    @ResponseStatus(HttpStatus.CREATED)
    public Map<String, String> signup(@Valid @RequestBody SignupRequest req) {
        authService.signup(req);
        return Map.of("message", "Account created. Please verify your account with the code we sent.");
    }

    @Operation(summary = "Verify email with OTP",
               description = "Submits the 6-digit code received by email. Code expires in 15 minutes.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Email verified"),
            @ApiResponse(responseCode = "400", description = "Invalid or expired code")
    })
    @PostMapping("/verify-otp")
    public LoginResponse verifyOtp(@Valid @RequestBody VerifyOtpRequest req) {
        return authService.verifyOtp(req);
    }

    @Operation(summary = "Resend verification OTP",
               description = "Invalidates the previous code and sends a fresh 6-digit OTP.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "New OTP sent"),
            @ApiResponse(responseCode = "400", description = "Email not found"),
            @ApiResponse(responseCode = "409", description = "Account already verified")
    })
    @PostMapping("/resend-verification")
    public Map<String, String> resendVerification(@Valid @RequestBody ResendVerificationRequest req) {
        authService.resendVerification(req);
        return Map.of("message", "Verification code sent.");
    }

    @Operation(summary = "Login",
               description = "Returns a JWT valid for 24 hours. Only verified accounts can log in.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Login successful, JWT returned"),
            @ApiResponse(responseCode = "401", description = "Invalid credentials or unverified email")
    })
    @PostMapping("/login")
    public LoginResponse login(@Valid @RequestBody LoginRequest req) {
        return authService.login(req);
    }

    @Operation(summary = "Request password reset",
               description = "Sends a reset link to the email if it exists. Always returns 200 regardless.")
    @PostMapping("/forgot-password")
    public Map<String, String> forgotPassword(@Valid @RequestBody ForgotPasswordRequest req) {
        authService.forgotPassword(req);
        return Map.of("message", "If an account with that email exists, a password reset link has been sent.");
    }

    @Operation(
        summary = "Refresh JWT token",
        description = "Exchanges a valid (non-expired) JWT for a fresh 30-day token. " +
                      "Call this on every app startup when a stored token exists."
    )
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "New token returned"),
            @ApiResponse(responseCode = "401", description = "Token missing, invalid, or expired")
    })
    @SecurityRequirement(name = "bearerAuth")
    @PostMapping("/refresh")
    public LoginResponse refresh(@AuthenticationPrincipal String userId) {
        return authService.refresh(userId);
    }

    @Operation(summary = "Logout", description = "Invalidates the current JWT and all other active tokens for this account.")
    @SecurityRequirement(name = "bearerAuth")
    @PostMapping("/logout")
    public Map<String, String> logout(@AuthenticationPrincipal String userId) {
        authService.logout(java.util.UUID.fromString(userId));
        return Map.of("message", "Logged out successfully.");
    }

    @Operation(summary = "Reset password",
               description = "Sets a new password using the token from the reset email. Token expires in 1 hour.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Password updated"),
            @ApiResponse(responseCode = "400", description = "Invalid or expired token")
    })
    @PostMapping("/reset-password")
    public Map<String, String> resetPassword(@Valid @RequestBody ResetPasswordRequest req) {
        authService.resetPassword(req);
        return Map.of("message", "Password reset successfully. You can now log in.");
    }
}
