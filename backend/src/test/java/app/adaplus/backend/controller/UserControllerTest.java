package app.adaplus.backend.controller;

import app.adaplus.backend.BaseIntegrationTest;
import app.adaplus.backend.entity.Role;
import app.adaplus.backend.entity.User;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.containsString;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

class UserControllerTest extends BaseIntegrationTest {

    private static final String ME       = "/api/v1/users/me";
    private static final String INVITES  = "/api/v1/users/invites";
    private static final String COUNT    = "/api/v1/users/count";

    // ── GET /me ──────────────────────────────────────────────────────────────

    @Test
    void getMe_returns401_withoutAuth() throws Exception {
        mockMvc.perform(get(ME))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void getMe_returns200_withAuth() throws Exception {
        User user = createUser(uniqueEmail(), Role.USER);

        mockMvc.perform(get(ME).header("Authorization", bearerToken(user)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.email").value(user.getEmail()))
                .andExpect(jsonPath("$.fullName").value(user.getFullName()));
    }

    // ── PUT /me ───────────────────────────────────────────────────────────────

    @Test
    void updateMe_returns401_withoutAuth() throws Exception {
        mockMvc.perform(put(ME)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"fullName":"Valid Name"}
                                """))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void updateMe_returns200_withValidName() throws Exception {
        User user = createUser(uniqueEmail(), Role.USER);

        mockMvc.perform(put(ME)
                        .header("Authorization", bearerToken(user))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"fullName":"Updated Name"}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.fullName").value("Updated Name"));
    }

    @Test
    void updateMe_returns200_withValidNameAndAddress() throws Exception {
        User user = createUser(uniqueEmail(), Role.USER);

        mockMvc.perform(put(ME)
                        .header("Authorization", bearerToken(user))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"fullName":"Ada Resident","address":"Büyükada Caddesi No:5"}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.fullName").value("Ada Resident"));
    }

    @Test
    void updateMe_returns400_whenNameBlank() throws Exception {
        User user = createUser(uniqueEmail(), Role.USER);

        mockMvc.perform(put(ME)
                        .header("Authorization", bearerToken(user))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"fullName":""}
                                """))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value(containsString("fullName")));
    }

    @Test
    void updateMe_returns400_whenNameTooShort() throws Exception {
        User user = createUser(uniqueEmail(), Role.USER);

        mockMvc.perform(put(ME)
                        .header("Authorization", bearerToken(user))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"fullName":"A"}
                                """))
                .andExpect(status().isBadRequest());
    }

    @Test
    void updateMe_returns400_whenNameTooLong() throws Exception {
        User user = createUser(uniqueEmail(), Role.USER);
        String longName = "A".repeat(101);

        mockMvc.perform(put(ME)
                        .header("Authorization", bearerToken(user))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"fullName":"%s"}
                                """.formatted(longName)))
                .andExpect(status().isBadRequest());
    }

    @Test
    void updateMe_returns400_whenNameContainsDigits() throws Exception {
        User user = createUser(uniqueEmail(), Role.USER);

        mockMvc.perform(put(ME)
                        .header("Authorization", bearerToken(user))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"fullName":"Ada123 Resident"}
                                """))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value(containsString("fullName")));
    }

    @Test
    void updateMe_returns400_whenAddressExceeds500Chars() throws Exception {
        User user = createUser(uniqueEmail(), Role.USER);
        String longAddress = "A".repeat(501);

        mockMvc.perform(put(ME)
                        .header("Authorization", bearerToken(user))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"fullName":"Valid Name","address":"%s"}
                                """.formatted(longAddress)))
                .andExpect(status().isBadRequest());
    }

    // ── DELETE /me ────────────────────────────────────────────────────────────

    @Test
    void deleteMe_returns401_withoutAuth() throws Exception {
        mockMvc.perform(delete(ME))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void deleteMe_returns204_withAuth() throws Exception {
        User user = createUser(uniqueEmail(), Role.USER);

        mockMvc.perform(delete(ME).header("Authorization", bearerToken(user)))
                .andExpect(status().isNoContent());
    }

    @Test
    void deleteMe_subsequentRequest_returns401() throws Exception {
        User user = createUser(uniqueEmail(), Role.USER);
        String token = bearerToken(user);

        mockMvc.perform(delete(ME).header("Authorization", token))
                .andExpect(status().isNoContent());

        // User is gone — same token must be rejected
        mockMvc.perform(get(ME).header("Authorization", token))
                .andExpect(status().isUnauthorized());
    }

    // ── Public user endpoints ─────────────────────────────────────────────────

    @Test
    void getUserCount_returns200_withoutAuth() throws Exception {
        mockMvc.perform(get(COUNT))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.count").isNumber());
    }

    @Test
    void getUserPosts_returns200_withoutAuth() throws Exception {
        User user = createUser(uniqueEmail(), Role.USER);

        mockMvc.perform(get("/api/v1/users/{id}/posts", user.getId()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content").isArray());
    }

    @Test
    void getUserPosts_returns404_whenUserNotFound() throws Exception {
        mockMvc.perform(get("/api/v1/users/{id}/posts", UUID.randomUUID()))
                .andExpect(status().isNotFound());
    }

    @Test
    void getUserReplies_returns200_withoutAuth() throws Exception {
        User user = createUser(uniqueEmail(), Role.USER);

        mockMvc.perform(get("/api/v1/users/{id}/replies", user.getId()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content").isArray());
    }

    @Test
    void getUserReplies_returns404_whenUserNotFound() throws Exception {
        mockMvc.perform(get("/api/v1/users/{id}/replies", UUID.randomUUID()))
                .andExpect(status().isNotFound());
    }

    @Test
    void getUserLikes_returns200_withoutAuth() throws Exception {
        User user = createUser(uniqueEmail(), Role.USER);

        mockMvc.perform(get("/api/v1/users/{id}/likes", user.getId()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content").isArray());
    }

    @Test
    void getUserLikes_returns404_whenUserNotFound() throws Exception {
        mockMvc.perform(get("/api/v1/users/{id}/likes", UUID.randomUUID()))
                .andExpect(status().isNotFound());
    }

    // ── Notifications ─────────────────────────────────────────────────────────

    @Test
    void getNotifications_returns401_withoutAuth() throws Exception {
        mockMvc.perform(get(ME + "/notifications"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void getNotifications_returns200_withAuth() throws Exception {
        User user = createUser(uniqueEmail(), Role.USER);

        mockMvc.perform(get(ME + "/notifications")
                        .header("Authorization", bearerToken(user)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray());
    }

    @Test
    void getUnreadCount_returns200_withAuth() throws Exception {
        User user = createUser(uniqueEmail(), Role.USER);

        mockMvc.perform(get(ME + "/notifications/unread-count")
                        .header("Authorization", bearerToken(user)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.count").isNumber());
    }

    @Test
    void markAllRead_returns204_withAuth() throws Exception {
        User user = createUser(uniqueEmail(), Role.USER);

        mockMvc.perform(post(ME + "/notifications/read-all")
                        .header("Authorization", bearerToken(user)))
                .andExpect(status().isNoContent());
    }

    // ── Admin: DELETE /users/{id} ─────────────────────────────────────────────

    @Test
    void adminDeleteUser_returns403_forRegularUser() throws Exception {
        User admin  = createUser(uniqueEmail(), Role.ADMIN);
        User target = createUser(uniqueEmail(), Role.USER);

        // Note: regular user calls this, but hasRole("ADMIN") at security layer → 403
        User regularUser = createUser(uniqueEmail(), Role.USER);
        mockMvc.perform(delete("/api/v1/users/{id}", target.getId())
                        .header("Authorization", bearerToken(regularUser)))
                .andExpect(status().isForbidden());
    }

    @Test
    void adminDeleteUser_returns204_forAdmin() throws Exception {
        User admin  = createUser(uniqueEmail(), Role.ADMIN);
        User target = createUser(uniqueEmail(), Role.USER);

        mockMvc.perform(delete("/api/v1/users/{id}", target.getId())
                        .header("Authorization", bearerToken(admin)))
                .andExpect(status().isNoContent());

        assertThat(userRepository.findById(target.getId())).isEmpty();
    }

    @Test
    void adminDeleteUser_returns404_whenUserNotFound() throws Exception {
        User admin = createUser(uniqueEmail(), Role.ADMIN);

        mockMvc.perform(delete("/api/v1/users/{id}", UUID.randomUUID())
                        .header("Authorization", bearerToken(admin)))
                .andExpect(status().isNotFound());
    }

    @Test
    void adminDeleteUser_returns409_whenDeletingAdmin() throws Exception {
        User admin  = createUser(uniqueEmail(), Role.ADMIN);
        User admin2 = createUser(uniqueEmail(), Role.ADMIN);

        mockMvc.perform(delete("/api/v1/users/{id}", admin2.getId())
                        .header("Authorization", bearerToken(admin)))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.message").value(containsString("Admin accounts cannot be deleted")));
    }

    // ── POST /invites ─────────────────────────────────────────────────────────

    @Test
    void sendInvite_returns401_withoutAuth() throws Exception {
        mockMvc.perform(post(INVITES)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"email":"someone@example.com"}
                                """))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void sendInvite_returns401_forRegularUser() throws Exception {
        User user = createUser(uniqueEmail(), Role.USER);  // TOURIST by default

        mockMvc.perform(post(INVITES)
                        .header("Authorization", bearerToken(user))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"email":"someone@example.com"}
                                """))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void sendInvite_returns204_forAdmin() throws Exception {
        User admin = createUser(uniqueEmail(), Role.ADMIN);

        mockMvc.perform(post(INVITES)
                        .header("Authorization", bearerToken(admin))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"email":"%s"}
                                """.formatted(uniqueEmail())))
                .andExpect(status().isNoContent());
    }

    @Test
    void sendInvite_returns400_whenEmailInvalid() throws Exception {
        User admin = createUser(uniqueEmail(), Role.ADMIN);

        mockMvc.perform(post(INVITES)
                        .header("Authorization", bearerToken(admin))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"email":"not-an-email"}
                                """))
                .andExpect(status().isBadRequest());
    }

    @Test
    void sendInvite_returns400_whenEmailBlank() throws Exception {
        User admin = createUser(uniqueEmail(), Role.ADMIN);

        mockMvc.perform(post(INVITES)
                        .header("Authorization", bearerToken(admin))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"email":""}
                                """))
                .andExpect(status().isBadRequest());
    }

    // ── GET /me/listings and /me/activities ───────────────────────────────────

    @Test
    void getMyListings_returns401_withoutAuth() throws Exception {
        mockMvc.perform(get(ME + "/listings"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void getMyListings_returns200_withAuth() throws Exception {
        User user = createUser(uniqueEmail(), Role.USER);

        mockMvc.perform(get(ME + "/listings")
                        .header("Authorization", bearerToken(user)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray());
    }

    @Test
    void getMyActivities_returns401_withoutAuth() throws Exception {
        mockMvc.perform(get(ME + "/activities"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void getMyActivities_returns200_withAuth() throws Exception {
        User user = createUser(uniqueEmail(), Role.USER);

        mockMvc.perform(get(ME + "/activities")
                        .header("Authorization", bearerToken(user)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray());
    }
}
