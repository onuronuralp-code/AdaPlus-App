package app.adaplus.backend.controller;

import app.adaplus.backend.dto.activity.ActivityDto;
import app.adaplus.backend.dto.forum.PostDto;
import app.adaplus.backend.dto.listing.ListingDto;
import app.adaplus.backend.dto.notification.NotificationDto;
import app.adaplus.backend.dto.user.InviteRequest;
import app.adaplus.backend.dto.user.UpdateUserRequest;
import app.adaplus.backend.dto.user.UserProfileDto;
import app.adaplus.backend.service.ActivityService;
import app.adaplus.backend.service.InviteService;
import app.adaplus.backend.service.ListingService;
import app.adaplus.backend.service.NotificationService;
import app.adaplus.backend.service.PostService;
import app.adaplus.backend.service.UserService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.security.SecurityRequirements;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/users")
@RequiredArgsConstructor
@Tag(name = "Users", description = "User profile management")
public class UserController {

    private final UserService userService;
    private final PostService postService;
    private final InviteService inviteService;
    private final ActivityService activityService;
    private final ListingService listingService;
    private final NotificationService notificationService;

    @Operation(summary = "Get own profile", description = "Returns the profile of the currently authenticated user.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Profile returned"),
            @ApiResponse(responseCode = "401", description = "Missing or invalid JWT")
    })
    @GetMapping("/me")
    public UserProfileDto getMe(@AuthenticationPrincipal String userId) {
        return userService.getProfile(UUID.fromString(userId));
    }

    @Operation(summary = "Get total user count", description = "Returns the total number of registered users. No auth required.")
    @SecurityRequirements
    @GetMapping("/count")
    public java.util.Map<String, Long> getUserCount() {
        return java.util.Map.of("count", userService.getUserCount());
    }

    @Operation(summary = "Update own profile", description = "Updates the full name of the authenticated user.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Profile updated"),
            @ApiResponse(responseCode = "400", description = "Validation error"),
            @ApiResponse(responseCode = "401", description = "Missing or invalid JWT")
    })
    @PutMapping("/me")
    public UserProfileDto updateMe(@AuthenticationPrincipal String userId,
                                   @Valid @RequestBody UpdateUserRequest req) {
        return userService.updateProfile(UUID.fromString(userId), req);
    }

    @Operation(summary = "Send OTP to verify a phone number on own account",
               description = "Attaches (or re-attaches) a phone number to the authenticated user's account and " +
                              "sends a verification code. Required before ISLAND_RESIDENT users can post on the forum.")
    @ApiResponses({
            @ApiResponse(responseCode = "204", description = "OTP sent"),
            @ApiResponse(responseCode = "400", description = "Validation error"),
            @ApiResponse(responseCode = "401", description = "Missing or invalid JWT"),
            @ApiResponse(responseCode = "409", description = "Phone number already linked to another account")
    })
    @PostMapping("/me/phone/send-otp")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void sendPhoneOtp(@AuthenticationPrincipal String userId,
                              @Valid @RequestBody app.adaplus.backend.dto.user.SendPhoneOtpRequest req) {
        userService.sendPhoneOtp(UUID.fromString(userId), req);
    }

    @Operation(summary = "Verify a phone number on own account",
               description = "Confirms the OTP sent via /me/phone/send-otp and marks the account's phone as verified.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Phone verified"),
            @ApiResponse(responseCode = "400", description = "Incorrect or expired code"),
            @ApiResponse(responseCode = "401", description = "Missing or invalid JWT"),
            @ApiResponse(responseCode = "409", description = "Phone number already linked to another account")
    })
    @PostMapping("/me/phone/verify")
    public UserProfileDto verifyPhone(@AuthenticationPrincipal String userId,
                                       @Valid @RequestBody app.adaplus.backend.dto.user.VerifyPhoneRequest req) {
        return userService.verifyPhone(UUID.fromString(userId), req);
    }

    @Operation(summary = "Send OTP to add an email address to own account",
               description = "Sends a verification code to a candidate email address. Only usable while the " +
                              "account has no email yet (e.g. a phone-signup user adding one later).")
    @ApiResponses({
            @ApiResponse(responseCode = "204", description = "OTP sent"),
            @ApiResponse(responseCode = "400", description = "Validation error"),
            @ApiResponse(responseCode = "401", description = "Missing or invalid JWT"),
            @ApiResponse(responseCode = "409", description = "Account already has an email, or address linked to another account")
    })
    @PostMapping("/me/email/send-otp")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void sendEmailOtp(@AuthenticationPrincipal String userId,
                              @Valid @RequestBody app.adaplus.backend.dto.user.SendEmailOtpRequest req) {
        userService.sendEmailOtp(UUID.fromString(userId), req);
    }

    @Operation(summary = "Verify and attach an email address to own account",
               description = "Confirms the OTP sent via /me/email/send-otp and sets the account's email.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Email verified and attached"),
            @ApiResponse(responseCode = "400", description = "Incorrect or expired code"),
            @ApiResponse(responseCode = "401", description = "Missing or invalid JWT"),
            @ApiResponse(responseCode = "409", description = "Account already has an email, or address linked to another account")
    })
    @PostMapping("/me/email/verify")
    public UserProfileDto verifyEmail(@AuthenticationPrincipal String userId,
                                       @Valid @RequestBody app.adaplus.backend.dto.user.VerifyEmailRequest req) {
        return userService.verifyEmail(UUID.fromString(userId), req);
    }

    @Operation(summary = "Delete own account", description = "Permanently deletes the authenticated user's account.")
    @ApiResponses({
            @ApiResponse(responseCode = "204", description = "Account deleted"),
            @ApiResponse(responseCode = "401", description = "Missing or invalid JWT")
    })
    @DeleteMapping("/me")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteMe(@AuthenticationPrincipal String userId) {
        userService.deleteAccount(UUID.fromString(userId));
    }

    @Operation(summary = "Get own listings", description = "Returns all listings submitted by the authenticated user (all statuses).")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Listings returned"),
            @ApiResponse(responseCode = "401", description = "Missing or invalid JWT")
    })
    @GetMapping("/me/listings")
    public List<ListingDto> getMyListings(@AuthenticationPrincipal String userId) {
        return listingService.getUserListings(UUID.fromString(userId));
    }

    @Operation(summary = "Get own activities", description = "Returns all activities submitted by the authenticated user (all statuses).")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Activities returned"),
            @ApiResponse(responseCode = "401", description = "Missing or invalid JWT")
    })
    @GetMapping("/me/activities")
    public List<ActivityDto> getMyActivities(@AuthenticationPrincipal String userId) {
        return activityService.getUserActivities(UUID.fromString(userId));
    }

    @Operation(summary = "Get a user's posts", description = "Paginated top-level posts by the given user. No auth required.")
    @SecurityRequirements
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Posts returned"),
            @ApiResponse(responseCode = "404", description = "User not found")
    })
    @GetMapping("/{id}/posts")
    public Page<PostDto> getUserPosts(
            @PathVariable UUID id,
            @Parameter(description = "Page number (0-based)") @RequestParam(defaultValue = "0") int page,
            @Parameter(description = "Page size") @RequestParam(defaultValue = "20") int size
    ) {
        return postService.getUserPosts(id, page, size);
    }

    @Operation(summary = "Get a user's replies", description = "Paginated replies by the given user. No auth required.")
    @SecurityRequirements
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Replies returned"),
            @ApiResponse(responseCode = "404", description = "User not found")
    })
    @GetMapping("/{id}/replies")
    public Page<PostDto> getUserReplies(
            @PathVariable UUID id,
            @Parameter(description = "Page number (0-based)") @RequestParam(defaultValue = "0") int page,
            @Parameter(description = "Page size") @RequestParam(defaultValue = "20") int size
    ) {
        return postService.getUserReplies(id, page, size);
    }

    @Operation(summary = "Get posts liked by a user", description = "Paginated posts the given user has liked. No auth required.")
    @SecurityRequirements
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Liked posts returned"),
            @ApiResponse(responseCode = "404", description = "User not found")
    })
    @GetMapping("/{id}/likes")
    public Page<PostDto> getUserLikes(
            @PathVariable UUID id,
            @Parameter(description = "Page number (0-based)") @RequestParam(defaultValue = "0") int page,
            @Parameter(description = "Page size") @RequestParam(defaultValue = "20") int size
    ) {
        return postService.getUserLikes(id, page, size);
    }

    @Operation(summary = "Get notifications", description = "Returns the authenticated user's notifications, newest first.")
    @GetMapping("/me/notifications")
    public List<NotificationDto> getMyNotifications(@AuthenticationPrincipal String userId) {
        return notificationService.getNotifications(UUID.fromString(userId));
    }

    @Operation(summary = "Get unread notification count")
    @GetMapping("/me/notifications/unread-count")
    public java.util.Map<String, Long> getUnreadCount(@AuthenticationPrincipal String userId) {
        return java.util.Map.of("count", notificationService.getUnreadCount(UUID.fromString(userId)));
    }

    @Operation(summary = "Mark one notification as read")
    @PostMapping("/me/notifications/{notificationId}/read")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void markOneRead(@AuthenticationPrincipal String userId,
                            @PathVariable UUID notificationId) {
        notificationService.markOneRead(notificationId, UUID.fromString(userId));
    }

    @Operation(summary = "Mark all notifications as read")
    @PostMapping("/me/notifications/read-all")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void markAllRead(@AuthenticationPrincipal String userId) {
        notificationService.markAllRead(UUID.fromString(userId));
    }

    @Operation(summary = "[ADMIN] Send island resident invite",
               description = "Sends an invite email granting ISLAND_RESIDENT status on signup. Requires ADMIN role.")
    @ApiResponses({
            @ApiResponse(responseCode = "204", description = "Invite sent"),
            @ApiResponse(responseCode = "400", description = "Email already invited"),
            @ApiResponse(responseCode = "403", description = "Admin role required")
    })
    @PostMapping("/invites")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void sendInvite(@Valid @RequestBody InviteRequest req) {
        inviteService.sendInvite(req.email());
    }

    @Operation(summary = "[ADMIN] Delete a user", description = "Deletes any non-admin user. Requires ADMIN role.")
    @ApiResponses({
            @ApiResponse(responseCode = "204", description = "User deleted"),
            @ApiResponse(responseCode = "401", description = "Missing or invalid JWT"),
            @ApiResponse(responseCode = "403", description = "Admin role required"),
            @ApiResponse(responseCode = "404", description = "User not found"),
            @ApiResponse(responseCode = "409", description = "Cannot delete admin accounts")
    })
    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteUser(@PathVariable UUID id) {
        userService.deleteUserAsAdmin(id);
    }
}
