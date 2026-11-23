package app.adaplus.backend.controller;

import app.adaplus.backend.BaseIntegrationTest;
import app.adaplus.backend.entity.Role;
import app.adaplus.backend.entity.User;
import app.adaplus.backend.repository.PostRepository;
import com.fasterxml.jackson.databind.JsonNode;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;

import java.time.Instant;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.containsString;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * Tests for POST /api/v1/forum/polls/{id}/vote
 *
 * Covers: authentication guard, successful vote, vote change (replace), voting on
 * a non-poll, expired poll, post-not-found, option-not-found, option-from-wrong-poll.
 */
class PollVoteControllerTest extends BaseIntegrationTest {

    private static final String POSTS_BASE = "/api/v1/forum/posts";
    private static final String POLLS_BASE = "/api/v1/forum/polls";

    @Autowired
    private PostRepository postRepository;

    /** Creates a POLL post and returns the full response body as a JsonNode. */
    private JsonNode createPoll(String token, String question) throws Exception {
        String body = mockMvc.perform(post(POSTS_BASE)
                        .header("Authorization", token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"content":"%s","postType":"POLL",
                                 "pollOptions":["Option A","Option B","Option C"],
                                 "pollDurationHours":24,"anonymous":false}
                                """.formatted(question)))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        return objectMapper.readTree(body);
    }

    /** Creates a MESSAGE post and returns its UUID. */
    private UUID createDiscussion(String token) throws Exception {
        String body = mockMvc.perform(post(POSTS_BASE)
                        .header("Authorization", token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"content":"Just a discussion post","postType":"MESSAGE","anonymous":false}
                                """))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        return UUID.fromString(objectMapper.readTree(body).get("id").asText());
    }

    // ── Auth guard ────────────────────────────────────────────────────────────

    @Test
    void vote_returns401_withoutAuth() throws Exception {
        mockMvc.perform(post(POLLS_BASE + "/" + UUID.randomUUID() + "/vote")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"optionId":"%s"}
                                """.formatted(UUID.randomUUID())))
                .andExpect(status().isUnauthorized());
    }

    // ── Successful vote ───────────────────────────────────────────────────────

    @Test
    void vote_returns200_andRecordsVote() throws Exception {
        User user = createUser(uniqueEmail(), Role.USER);
        String token = bearerToken(user);

        JsonNode poll = createPoll(token, "Best island?");
        UUID pollId  = UUID.fromString(poll.get("id").asText());
        UUID optionId = UUID.fromString(poll.get("pollOptions").get(0).get("id").asText());

        String resp = mockMvc.perform(post(POLLS_BASE + "/" + pollId + "/vote")
                        .header("Authorization", token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"optionId":"%s"}
                                """.formatted(optionId)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(pollId.toString()))
                .andExpect(jsonPath("$.pollOptions").isArray())
                .andReturn().getResponse().getContentAsString();

        // First option should now have 1 vote
        JsonNode options = objectMapper.readTree(resp).get("pollOptions");
        long votesForOption = options.get(0).get("voteCount").asLong();
        assertThat(votesForOption).isEqualTo(1L);
    }

    @Test
    void vote_canChangeVote_replacesOldVote() throws Exception {
        User user  = createUser(uniqueEmail(), Role.USER);
        User user2 = createUser(uniqueEmail(), Role.USER);
        String token  = bearerToken(user);
        String token2 = bearerToken(user2);

        // Create poll as user2 (so user can be the voter)
        JsonNode poll = createPoll(token2, "Change vote test?");
        UUID pollId   = UUID.fromString(poll.get("id").asText());
        UUID optionA  = UUID.fromString(poll.get("pollOptions").get(0).get("id").asText());
        UUID optionB  = UUID.fromString(poll.get("pollOptions").get(1).get("id").asText());

        // Vote A
        mockMvc.perform(post(POLLS_BASE + "/" + pollId + "/vote")
                        .header("Authorization", token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"optionId":"%s"}
                                """.formatted(optionA)))
                .andExpect(status().isOk());

        // Change to B
        String resp = mockMvc.perform(post(POLLS_BASE + "/" + pollId + "/vote")
                        .header("Authorization", token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"optionId":"%s"}
                                """.formatted(optionB)))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();

        JsonNode options = objectMapper.readTree(resp).get("pollOptions");
        // Option A should have 0 votes, option B should have 1
        assertThat(options.get(0).get("voteCount").asLong()).isEqualTo(0L);
        assertThat(options.get(1).get("voteCount").asLong()).isEqualTo(1L);
    }

    @Test
    void vote_multipleUsers_countsCorrectly() throws Exception {
        User creator = createUser(uniqueEmail(), Role.USER);
        User voter1  = createUser(uniqueEmail(), Role.USER);
        User voter2  = createUser(uniqueEmail(), Role.USER);

        JsonNode poll = createPoll(bearerToken(creator), "Multiple voters?");
        UUID pollId   = UUID.fromString(poll.get("id").asText());
        UUID optionA  = UUID.fromString(poll.get("pollOptions").get(0).get("id").asText());
        UUID optionB  = UUID.fromString(poll.get("pollOptions").get(1).get("id").asText());

        // voter1 → A
        mockMvc.perform(post(POLLS_BASE + "/" + pollId + "/vote")
                        .header("Authorization", bearerToken(voter1))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"optionId":"%s"}
                                """.formatted(optionA)))
                .andExpect(status().isOk());

        // voter2 → B
        String resp = mockMvc.perform(post(POLLS_BASE + "/" + pollId + "/vote")
                        .header("Authorization", bearerToken(voter2))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"optionId":"%s"}
                                """.formatted(optionB)))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();

        JsonNode options = objectMapper.readTree(resp).get("pollOptions");
        assertThat(options.get(0).get("voteCount").asLong()).isEqualTo(1L); // A
        assertThat(options.get(1).get("voteCount").asLong()).isEqualTo(1L); // B
        // Percentages should be 50 / 50
        assertThat(options.get(0).get("percentage").asDouble()).isEqualTo(50.0);
        assertThat(options.get(1).get("percentage").asDouble()).isEqualTo(50.0);
    }

    // ── Voting on wrong post type ─────────────────────────────────────────────

    @Test
    void vote_returns400_whenPostIsNotAPoll() throws Exception {
        User user = createUser(uniqueEmail(), Role.USER);
        String token = bearerToken(user);

        UUID discussionId = createDiscussion(token);

        mockMvc.perform(post(POLLS_BASE + "/" + discussionId + "/vote")
                        .header("Authorization", token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"optionId":"%s"}
                                """.formatted(UUID.randomUUID())))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value(containsString("not a poll")));
    }

    // ── Post / option not found ───────────────────────────────────────────────

    @Test
    void vote_returns404_whenPostNotFound() throws Exception {
        User user = createUser(uniqueEmail(), Role.USER);

        mockMvc.perform(post(POLLS_BASE + "/" + UUID.randomUUID() + "/vote")
                        .header("Authorization", bearerToken(user))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"optionId":"%s"}
                                """.formatted(UUID.randomUUID())))
                .andExpect(status().isNotFound());
    }

    @Test
    void vote_returns404_whenOptionNotFound() throws Exception {
        User user = createUser(uniqueEmail(), Role.USER);
        String token = bearerToken(user);

        JsonNode poll = createPoll(token, "Option not found test?");
        UUID pollId = UUID.fromString(poll.get("id").asText());

        mockMvc.perform(post(POLLS_BASE + "/" + pollId + "/vote")
                        .header("Authorization", token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"optionId":"%s"}
                                """.formatted(UUID.randomUUID())))
                .andExpect(status().isNotFound());
    }

    @Test
    void vote_returns400_whenOptionBelongsToDifferentPoll() throws Exception {
        User user = createUser(uniqueEmail(), Role.USER);
        String token = bearerToken(user);

        JsonNode poll1 = createPoll(token, "First poll question");
        JsonNode poll2 = createPoll(token, "Second poll question");

        UUID poll1Id = UUID.fromString(poll1.get("id").asText());
        // Take an option from poll2 and try to vote on poll1
        UUID poll2OptionId = UUID.fromString(poll2.get("pollOptions").get(0).get("id").asText());

        mockMvc.perform(post(POLLS_BASE + "/" + poll1Id + "/vote")
                        .header("Authorization", token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"optionId":"%s"}
                                """.formatted(poll2OptionId)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value(containsString("does not belong")));
    }

    // ── Expired poll ──────────────────────────────────────────────────────────

    @Test
    void vote_returns429_whenPollHasExpired() throws Exception {
        User user = createUser(uniqueEmail(), Role.USER);
        String token = bearerToken(user);

        JsonNode poll = createPoll(token, "Expiry test poll?");
        UUID pollId  = UUID.fromString(poll.get("id").asText());
        UUID optionId = UUID.fromString(poll.get("pollOptions").get(0).get("id").asText());

        // Manually expire the poll via repository
        postRepository.findById(pollId).ifPresent(p -> {
            p.setPollEndsAt(Instant.now().minusSeconds(1));
            postRepository.save(p);
        });

        // GlobalExceptionHandler maps IllegalStateException → 429
        mockMvc.perform(post(POLLS_BASE + "/" + pollId + "/vote")
                        .header("Authorization", token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"optionId":"%s"}
                                """.formatted(optionId)))
                .andExpect(status().isTooManyRequests())
                .andExpect(jsonPath("$.message").value(containsString("poll has ended")));
    }

    // ── Missing option ID ─────────────────────────────────────────────────────

    @Test
    void vote_returns400_whenOptionIdMissing() throws Exception {
        User user = createUser(uniqueEmail(), Role.USER);
        String token = bearerToken(user);

        JsonNode poll = createPoll(token, "Missing option test?");
        UUID pollId = UUID.fromString(poll.get("id").asText());

        mockMvc.perform(post(POLLS_BASE + "/" + pollId + "/vote")
                        .header("Authorization", token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value(containsString("optionId")));
    }
}
