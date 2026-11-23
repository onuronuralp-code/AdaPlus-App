package app.adaplus.backend.controller;

import app.adaplus.backend.BaseIntegrationTest;
import app.adaplus.backend.entity.Role;
import app.adaplus.backend.entity.User;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;

import java.util.UUID;

import static org.hamcrest.Matchers.containsString;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * Extended tests for PUT /api/v1/forum/posts/{id} (edit) and
 * DELETE /api/v1/forum/posts/{id} (delete).
 *
 * Covers: authorization, content boundary validation, poll-edit restriction,
 * cross-user protection, admin override, and 404 handling.
 */
class PostControllerExtendedTest extends BaseIntegrationTest {

    private static final String BASE = "/api/v1/forum/posts";

    /** Create a MESSAGE post and return its ID. */
    private UUID createPost(String token, String content) throws Exception {
        String body = mockMvc.perform(post(BASE)
                        .header("Authorization", token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"content":"%s","postType":"MESSAGE","anonymous":false}
                                """.formatted(content)))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        return UUID.fromString(objectMapper.readTree(body).get("id").asText());
    }

    /** Create a POLL post and return its ID. */
    private UUID createPoll(String token) throws Exception {
        String body = mockMvc.perform(post(BASE)
                        .header("Authorization", token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"content":"Poll question here?","postType":"POLL","pollOptions":["Yes","No"],
                                 "pollDurationHours":24,"anonymous":false}
                                """))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        return UUID.fromString(objectMapper.readTree(body).get("id").asText());
    }

    // ── updatePost: auth ──────────────────────────────────────────────────────

    @Test
    void updatePost_returns401_withoutAuth() throws Exception {
        mockMvc.perform(put(BASE + "/" + UUID.randomUUID())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"content":"Updated content here"}
                                """))
                .andExpect(status().isUnauthorized());
    }

    // ── updatePost: success ───────────────────────────────────────────────────

    @Test
    void updatePost_returns200_withValidContent() throws Exception {
        User user = createUser(uniqueEmail(), Role.USER);
        String token = bearerToken(user);
        UUID postId = createPost(token, "Original content here");

        mockMvc.perform(put(BASE + "/" + postId)
                        .header("Authorization", token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"content":"Updated and improved content"}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content").value("Updated and improved content"));
    }

    @Test
    void updatePost_returns200_whenAdminEditsAnyPost() throws Exception {
        User user  = createUser(uniqueEmail(), Role.USER);
        User admin = createUser(uniqueEmail(), Role.ADMIN);
        UUID postId = createPost(bearerToken(user), "User post that admin will edit");

        mockMvc.perform(put(BASE + "/" + postId)
                        .header("Authorization", bearerToken(admin))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"content":"Admin-corrected version of the post"}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content").value("Admin-corrected version of the post"));
    }

    // ── updatePost: validation ────────────────────────────────────────────────

    @Test
    void updatePost_returns400_whenContentTooShort() throws Exception {
        User user = createUser(uniqueEmail(), Role.USER);
        String token = bearerToken(user);
        UUID postId = createPost(token, "Original valid content");

        mockMvc.perform(put(BASE + "/" + postId)
                        .header("Authorization", token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"content":"Hi"}
                                """))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value(containsString("content")));
    }

    @Test
    void updatePost_returns400_whenContentTooLong() throws Exception {
        User user = createUser(uniqueEmail(), Role.USER);
        String token = bearerToken(user);
        UUID postId = createPost(token, "Original valid content");

        mockMvc.perform(put(BASE + "/" + postId)
                        .header("Authorization", token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"content":"%s"}
                                """.formatted("A".repeat(1001))))
                .andExpect(status().isBadRequest());
    }

    @Test
    void updatePost_returns400_whenContentBlank() throws Exception {
        User user = createUser(uniqueEmail(), Role.USER);
        String token = bearerToken(user);
        UUID postId = createPost(token, "Original valid content");

        mockMvc.perform(put(BASE + "/" + postId)
                        .header("Authorization", token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"content":"   "}
                                """))
                .andExpect(status().isBadRequest());
    }

    @Test
    void updatePost_returns400_whenImageUrlTooLong() throws Exception {
        User user = createUser(uniqueEmail(), Role.USER);
        String token = bearerToken(user);
        UUID postId = createPost(token, "Original valid content");
        String tooLong = "https://example.com/" + "x".repeat(490);

        mockMvc.perform(put(BASE + "/" + postId)
                        .header("Authorization", token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"content\":\"Valid updated content\",\"imageUrl\":\"" + tooLong + "\"}"))
                .andExpect(status().isBadRequest());
    }

    // ── updatePost: authorization ─────────────────────────────────────────────

    @Test
    void updatePost_returns401_whenEditingOtherUsersPost() throws Exception {
        User owner  = createUser(uniqueEmail(), Role.USER);
        User other  = createUser(uniqueEmail(), Role.USER);
        UUID postId = createPost(bearerToken(owner), "Owner's original post content");

        // UnauthorizedException in service → 401
        mockMvc.perform(put(BASE + "/" + postId)
                        .header("Authorization", bearerToken(other))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"content":"Trying to hijack this post"}
                                """))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.message").value(containsString("only edit your own")));
    }

    // ── updatePost: poll restriction ──────────────────────────────────────────

    @Test
    void updatePost_returns400_whenEditingPoll() throws Exception {
        User user = createUser(uniqueEmail(), Role.USER);
        String token = bearerToken(user);
        UUID pollId = createPoll(token);

        mockMvc.perform(put(BASE + "/" + pollId)
                        .header("Authorization", token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"content":"Trying to edit a poll"}
                                """))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value(containsString("Poll posts cannot be edited")));
    }

    // ── updatePost: not found ─────────────────────────────────────────────────

    @Test
    void updatePost_returns404_whenPostNotFound() throws Exception {
        User user = createUser(uniqueEmail(), Role.USER);

        mockMvc.perform(put(BASE + "/" + UUID.randomUUID())
                        .header("Authorization", bearerToken(user))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"content":"Updating nonexistent post"}
                                """))
                .andExpect(status().isNotFound());
    }

    // ── deletePost: auth ──────────────────────────────────────────────────────

    @Test
    void deletePost_returns401_withoutAuth() throws Exception {
        mockMvc.perform(delete(BASE + "/" + UUID.randomUUID()))
                .andExpect(status().isUnauthorized());
    }

    // ── deletePost: success ───────────────────────────────────────────────────

    @Test
    void deletePost_returns204_byOwner() throws Exception {
        User user = createUser(uniqueEmail(), Role.USER);
        String token = bearerToken(user);
        UUID postId = createPost(token, "Post to be deleted by owner");

        mockMvc.perform(delete(BASE + "/" + postId)
                        .header("Authorization", token))
                .andExpect(status().isNoContent());

        // Subsequent GET must return 404 (post is gone)
        mockMvc.perform(get(BASE + "/" + postId + "/replies"))
                .andExpect(status().isNotFound());
    }

    @Test
    void deletePost_returns204_whenAdminDeletesAnyPost() throws Exception {
        User user  = createUser(uniqueEmail(), Role.USER);
        User admin = createUser(uniqueEmail(), Role.ADMIN);
        UUID postId = createPost(bearerToken(user), "Post that admin will delete");

        mockMvc.perform(delete(BASE + "/" + postId)
                        .header("Authorization", bearerToken(admin)))
                .andExpect(status().isNoContent());
    }

    // ── deletePost: authorization ─────────────────────────────────────────────

    @Test
    void deletePost_returns401_whenDeletingOtherUsersPost() throws Exception {
        User owner  = createUser(uniqueEmail(), Role.USER);
        User other  = createUser(uniqueEmail(), Role.USER);
        UUID postId = createPost(bearerToken(owner), "Owner's post that other tries to delete");

        mockMvc.perform(delete(BASE + "/" + postId)
                        .header("Authorization", bearerToken(other)))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.message").value(containsString("only delete your own")));
    }

    // ── deletePost: not found ─────────────────────────────────────────────────

    @Test
    void deletePost_returns404_whenPostNotFound() throws Exception {
        User user = createUser(uniqueEmail(), Role.USER);

        mockMvc.perform(delete(BASE + "/" + UUID.randomUUID())
                        .header("Authorization", bearerToken(user)))
                .andExpect(status().isNotFound());
    }

    // ── deletePost: basic cascade — delete reply then parent ─────────────────

    @Test
    void deletePost_canDeleteReply_independentlyOfParent() throws Exception {
        User user  = createUser(uniqueEmail(), Role.USER);
        User user2 = createUser(uniqueEmail(), Role.USER);
        String token  = bearerToken(user);
        String token2 = bearerToken(user2);

        UUID parentId = createPost(token, "Parent post that stays alive");

        // Create a reply as user2
        String replyBody = mockMvc.perform(post(BASE)
                        .header("Authorization", token2)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"content":"A reply to the parent post","postType":"MESSAGE","parentId":"%s","anonymous":false}
                                """.formatted(parentId)))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        UUID replyId = UUID.fromString(objectMapper.readTree(replyBody).get("id").asText());

        // user2 deletes their own reply — must succeed
        mockMvc.perform(delete(BASE + "/" + replyId)
                        .header("Authorization", token2))
                .andExpect(status().isNoContent());

        // Parent still exists — replies list is now empty
        mockMvc.perform(get(BASE + "/" + parentId + "/replies"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$.length()").value(0));
    }

    // ── updatePost: boundary — exactly at limits ──────────────────────────────

    @Test
    void updatePost_returns200_whenContentIsExactlyMinLength() throws Exception {
        User user = createUser(uniqueEmail(), Role.USER);
        String token = bearerToken(user);
        UUID postId = createPost(token, "Valid original post content");

        mockMvc.perform(put(BASE + "/" + postId)
                        .header("Authorization", token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"content":"Abc"}
                                """))
                .andExpect(status().isOk());
    }

    @Test
    void updatePost_returns200_whenContentIsExactlyMaxLength() throws Exception {
        User user = createUser(uniqueEmail(), Role.USER);
        String token = bearerToken(user);
        UUID postId = createPost(token, "Valid original post content");

        mockMvc.perform(put(BASE + "/" + postId)
                        .header("Authorization", token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"content":"%s"}
                                """.formatted("A".repeat(1000))))
                .andExpect(status().isOk());
    }
}
