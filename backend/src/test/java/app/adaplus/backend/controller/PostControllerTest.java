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
 * forum.daily-post-limit is set to 2 in application-test.yml to make the
 * rate-limit test feasible without creating many posts.
 */
class PostControllerTest extends BaseIntegrationTest {

    private static final String BASE = "/api/v1/forum/posts";

    private String discussionJson(String content) {
        return """
                {"content":"%s","postType":"MESSAGE","anonymous":false}
                """.formatted(content);
    }

    private UUID createPost(String token, String content) throws Exception {
        String body = mockMvc.perform(post(BASE)
                        .header("Authorization", token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(discussionJson(content)))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        return UUID.fromString(objectMapper.readTree(body).get("id").asText());
    }

    // ── Auth ─────────────────────────────────────────────────────────────────

    @Test
    void createPost_returns401_withoutAuth() throws Exception {
        mockMvc.perform(post(BASE)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(discussionJson("Hello world")))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void createPost_returns201_withValidDiscussionPost() throws Exception {
        User user = createUser(uniqueEmail(), Role.USER);
        mockMvc.perform(post(BASE)
                        .header("Authorization", bearerToken(user))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(discussionJson("A nice discussion post")))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").exists())
                .andExpect(jsonPath("$.postType").value("MESSAGE"))
                .andExpect(jsonPath("$.island").doesNotExist());
    }

    // ── Validation: content boundaries ───────────────────────────────────────

    @Test
    void createPost_returns400_whenContentTooShort() throws Exception {
        User user = createUser(uniqueEmail(), Role.USER);
        mockMvc.perform(post(BASE)
                        .header("Authorization", bearerToken(user))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(discussionJson("Hi"))) // 2 chars — below min 3
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value(containsString("content")));
    }

    @Test
    void createPost_returns400_whenContentTooLong() throws Exception {
        User user = createUser(uniqueEmail(), Role.USER);
        mockMvc.perform(post(BASE)
                        .header("Authorization", bearerToken(user))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(discussionJson("A".repeat(1001)))) // exceeds max 1000
                .andExpect(status().isBadRequest());
    }

    @Test
    void createPost_returns400_whenContentBlank() throws Exception {
        User user = createUser(uniqueEmail(), Role.USER);
        mockMvc.perform(post(BASE)
                        .header("Authorization", bearerToken(user))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"content":"   ","postType":"MESSAGE","anonymous":false}
                                """))
                .andExpect(status().isBadRequest());
    }

    @Test
    void createPost_defaultsToMessage_whenPostTypeMissing() throws Exception {
        User user = createUser(uniqueEmail(), Role.USER);
        mockMvc.perform(post(BASE)
                        .header("Authorization", bearerToken(user))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"content":"Valid content","anonymous":false}
                                """))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.postType").value("MESSAGE"));
    }

    @Test
    void createPost_mapsLegacyPostTypeToMessage() throws Exception {
        User user = createUser(uniqueEmail(), Role.USER);
        mockMvc.perform(post(BASE)
                        .header("Authorization", bearerToken(user))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"content":"Valid content","postType":"COMPLAINT","island":"BUYUKADA","anonymous":false}
                                """))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.postType").value("MESSAGE"));
    }

    // ── Photo posts ───────────────────────────────────────────────────────────

    @Test
    void createPost_returns201_withPhotoAndNoText() throws Exception {
        User user = createUser(uniqueEmail(), Role.USER);
        mockMvc.perform(post(BASE)
                        .header("Authorization", bearerToken(user))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"postType":"MESSAGE","imageUrl":"/api/v1/media/photo.jpg","anonymous":false}
                                """))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.imageUrl").value("/api/v1/media/photo.jpg"))
                .andExpect(jsonPath("$.content").value(""));
    }

    @Test
    void createPost_returns201_withPhotoAndShortCaption() throws Exception {
        User user = createUser(uniqueEmail(), Role.USER);
        mockMvc.perform(post(BASE)
                        .header("Authorization", bearerToken(user))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"content":"👍","postType":"MESSAGE","imageUrl":"/api/v1/media/photo.jpg","anonymous":false}
                                """))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.imageUrl").value("/api/v1/media/photo.jpg"));
    }

    @Test
    void createPost_returns400_whenNoTextAndNoPhoto() throws Exception {
        User user = createUser(uniqueEmail(), Role.USER);
        mockMvc.perform(post(BASE)
                        .header("Authorization", bearerToken(user))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"postType":"MESSAGE","anonymous":false}
                                """))
                .andExpect(status().isBadRequest());
    }

    // ── Poll validation ───────────────────────────────────────────────────────

    @Test
    void createPoll_returns400_whenDurationMissing() throws Exception {
        User user = createUser(uniqueEmail(), Role.USER);
        mockMvc.perform(post(BASE)
                        .header("Authorization", bearerToken(user))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"content":"Which island is best?","postType":"POLL",
                                 "pollOptions":["Büyükada","Heybeliada"],"anonymous":false}
                                """))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value(containsString("duration")));
    }

    @Test
    void createPoll_returns400_whenFewerThanTwoOptions() throws Exception {
        User user = createUser(uniqueEmail(), Role.USER);
        mockMvc.perform(post(BASE)
                        .header("Authorization", bearerToken(user))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"content":"Best island?","postType":"POLL",
                                 "pollOptions":["Büyükada"],"pollDurationHours":24,"anonymous":false}
                                """))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value(containsString("2 options")));
    }

    @Test
    void createPoll_returns400_whenMoreThanSixOptions() throws Exception {
        User user = createUser(uniqueEmail(), Role.USER);
        mockMvc.perform(post(BASE)
                        .header("Authorization", bearerToken(user))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"content":"Best island?","postType":"POLL",
                                 "pollOptions":["A","B","C","D","E","F","G"],
                                 "pollDurationHours":24,"anonymous":false}
                                """))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value(containsString("6 options")));
    }

    @Test
    void createPoll_returns400_whenDurationTooLong() throws Exception {
        User user = createUser(uniqueEmail(), Role.USER);
        mockMvc.perform(post(BASE)
                        .header("Authorization", bearerToken(user))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"content":"Best island?","postType":"POLL",
                                 "pollOptions":["A","B"],"pollDurationHours":169,"anonymous":false}
                                """))
                .andExpect(status().isBadRequest());
    }

    @Test
    void createPoll_returns201_withValidPayload() throws Exception {
        User user = createUser(uniqueEmail(), Role.USER);
        mockMvc.perform(post(BASE)
                        .header("Authorization", bearerToken(user))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"content":"Best island?","postType":"POLL",
                                 "pollOptions":["Büyükada","Heybeliada","Burgazada"],
                                 "pollDurationHours":48,"anonymous":false}
                                """))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.postType").value("POLL"))
                .andExpect(jsonPath("$.pollOptions").isArray());
    }

    // ── Like ─────────────────────────────────────────────────────────────────

    @Test
    void toggleLike_returns401_withoutAuth() throws Exception {
        mockMvc.perform(post(BASE + "/" + UUID.randomUUID() + "/like"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void toggleLike_togglesLikedState() throws Exception {
        User author = createUser(uniqueEmail(), Role.USER);
        User liker  = createUser(uniqueEmail(), Role.USER);
        UUID postId = createPost(bearerToken(author), "Likeable post content");

        // Like
        String resp1 = mockMvc.perform(post(BASE + "/" + postId + "/like")
                        .header("Authorization", bearerToken(liker)))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        org.assertj.core.api.Assertions.assertThat(
                objectMapper.readTree(resp1).get("liked").asBoolean()).isTrue();

        // Unlike
        String resp2 = mockMvc.perform(post(BASE + "/" + postId + "/like")
                        .header("Authorization", bearerToken(liker)))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        org.assertj.core.api.Assertions.assertThat(
                objectMapper.readTree(resp2).get("liked").asBoolean()).isFalse();
    }

    @Test
    void toggleLike_returns404_whenPostNotFound() throws Exception {
        User user = createUser(uniqueEmail(), Role.USER);
        mockMvc.perform(post(BASE + "/" + UUID.randomUUID() + "/like")
                        .header("Authorization", bearerToken(user)))
                .andExpect(status().isNotFound());
    }

    // ── Report ────────────────────────────────────────────────────────────────

    @Test
    void reportPost_returns409_whenReportedTwice() throws Exception {
        User author   = createUser(uniqueEmail(), Role.USER);
        User reporter = createUser(uniqueEmail(), Role.USER);
        UUID postId   = createPost(bearerToken(author), "Reportable content here");

        // First report — 204 No Content (void endpoint)
        mockMvc.perform(post(BASE + "/" + postId + "/report")
                        .header("Authorization", bearerToken(reporter)))
                .andExpect(status().isNoContent());

        // Second report from same user — ConflictException → 409
        mockMvc.perform(post(BASE + "/" + postId + "/report")
                        .header("Authorization", bearerToken(reporter)))
                .andExpect(status().isConflict());
    }

    // ── Replies ───────────────────────────────────────────────────────────────

    @Test
    void createReply_returns400_whenReplyingToReply() throws Exception {
        User user = createUser(uniqueEmail(), Role.USER);
        String token = bearerToken(user);

        UUID parentId = createPost(token, "Top-level post content");

        // First reply — OK
        String replyBody = mockMvc.perform(post(BASE)
                        .header("Authorization", token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"content":"First reply","postType":"MESSAGE",
                                 "parentId":"%s","anonymous":false}
                                """.formatted(parentId)))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        UUID replyId = UUID.fromString(objectMapper.readTree(replyBody).get("id").asText());

        // Reply to a reply — must fail (use a different user to reset daily limit)
        User user2 = createUser(uniqueEmail(), Role.USER);
        mockMvc.perform(post(BASE)
                        .header("Authorization", bearerToken(user2))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"content":"Reply to reply","postType":"MESSAGE",
                                 "parentId":"%s","anonymous":false}
                                """.formatted(replyId)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value(containsString("Replies to replies")));
    }

    // ── Public read ───────────────────────────────────────────────────────────

    @Test
    void getPosts_returns200_withoutAuth() throws Exception {
        mockMvc.perform(get(BASE))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content").isArray());
    }

    @Test
    void getReplies_returns200_withoutAuth() throws Exception {
        User user = createUser(uniqueEmail(), Role.USER);
        UUID postId = createPost(bearerToken(user), "Post for replies endpoint");
        mockMvc.perform(get(BASE + "/" + postId + "/replies"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray());
    }
}
