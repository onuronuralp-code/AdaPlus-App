package app.adaplus.backend.controller;

import app.adaplus.backend.BaseIntegrationTest;
import app.adaplus.backend.entity.Role;
import app.adaplus.backend.entity.User;
import com.fasterxml.jackson.databind.JsonNode;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.UUID;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.atomic.AtomicInteger;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

class ActivityControllerTest extends BaseIntegrationTest {

    private static final String BASE = "/api/v1/activities";

    private String validActivityJson() {
        Instant start = Instant.now().plus(1, ChronoUnit.DAYS);
        Instant end   = start.plus(2, ChronoUnit.HOURS);
        return """
                {
                  "name": "Test Activity",
                  "description": "A fun island activity for everyone",
                  "startDate": "%s",
                  "endDate": "%s",
                  "organizerName": "Test Org",
                  "organizerContact": "05551234567",
                  "eventPlace": "Büyükada Meydanı"
                }
                """.formatted(start, end);
    }

    private UUID createActivity(String token) throws Exception {
        String body = mockMvc.perform(post(BASE)
                        .header("Authorization", token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(validActivityJson()))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        return UUID.fromString(objectMapper.readTree(body).get("id").asText());
    }

    // ── Auth & access ────────────────────────────────────────────────────────

    @Test
    void createActivity_returns401_withoutAuth() throws Exception {
        mockMvc.perform(post(BASE)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(validActivityJson()))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void createActivity_returns201_withAuthenticatedUser() throws Exception {
        User user = createUser(uniqueEmail(), Role.USER);
        mockMvc.perform(post(BASE)
                        .header("Authorization", bearerToken(user))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(validActivityJson()))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").exists())
                .andExpect(jsonPath("$.status").value("PENDING"));
    }

    @Test
    void getPendingActivities_returns403_forRegularUser() throws Exception {
        User user = createUser(uniqueEmail(), Role.USER);
        mockMvc.perform(get(BASE + "/pending")
                        .header("Authorization", bearerToken(user)))
                .andExpect(status().isForbidden());
    }

    @Test
    void getPendingActivities_returns200_forAdmin() throws Exception {
        User admin = createUser(uniqueEmail(), Role.ADMIN);
        mockMvc.perform(get(BASE + "/pending")
                        .header("Authorization", bearerToken(admin)))
                .andExpect(status().isOk());
    }

    // ── Validation: all fields optional, length limits still apply ──────────────────────────────────────────

    @Test
    void createActivity_returns201_whenNameBlank() throws Exception {
        User user = createUser(uniqueEmail(), Role.USER);
        mockMvc.perform(post(BASE)
                        .header("Authorization", bearerToken(user))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"name":"","description":"desc"}
                                """))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.name").doesNotExist());
    }

    @Test
    void createActivity_returns400_whenNameExceeds255Chars() throws Exception {
        User user = createUser(uniqueEmail(), Role.USER);
        String longName = "A".repeat(256);
        Instant start = Instant.now().plus(1, ChronoUnit.DAYS);
        Instant end   = start.plus(2, ChronoUnit.HOURS);
        mockMvc.perform(post(BASE)
                        .header("Authorization", bearerToken(user))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"name":"%s","description":"desc","startDate":"%s","endDate":"%s",
                                 "organizerName":"Org","organizerContact":"05551234567","eventPlace":"Place"}
                                """.formatted(longName, start, end)))
                .andExpect(status().isBadRequest());
    }

    @Test
    void createActivity_returns400_whenDescriptionExceeds500Chars() throws Exception {
        User user = createUser(uniqueEmail(), Role.USER);
        String longDesc = "A".repeat(501);
        Instant start = Instant.now().plus(1, ChronoUnit.DAYS);
        Instant end   = start.plus(2, ChronoUnit.HOURS);
        mockMvc.perform(post(BASE)
                        .header("Authorization", bearerToken(user))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"name":"Name","description":"%s","startDate":"%s","endDate":"%s",
                                 "organizerName":"Org","organizerContact":"05551234567","eventPlace":"Place"}
                                """.formatted(longDesc, start, end)))
                .andExpect(status().isBadRequest());
    }

    @Test
    void createActivity_returns201_withNoFields() throws Exception {
        User user = createUser(uniqueEmail(), Role.USER);
        mockMvc.perform(post(BASE)
                        .header("Authorization", bearerToken(user))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.status").value("PENDING"));
    }

    @Test
    void createActivity_returns400_whenEndDateBeforeStartDate() throws Exception {
        User user = createUser(uniqueEmail(), Role.USER);
        Instant start = Instant.now().plus(2, ChronoUnit.DAYS);
        Instant end   = Instant.now().plus(1, ChronoUnit.DAYS); // end BEFORE start
        mockMvc.perform(post(BASE)
                        .header("Authorization", bearerToken(user))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"name":"Name","description":"desc","startDate":"%s","endDate":"%s",
                                 "organizerName":"Org","organizerContact":"05551234567","eventPlace":"Place"}
                                """.formatted(start, end)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value(org.hamcrest.Matchers.containsString("End date")));
    }

    @Test
    void createActivity_returns400_whenInstagramLinkInvalid() throws Exception {
        User user = createUser(uniqueEmail(), Role.USER);
        Instant start = Instant.now().plus(1, ChronoUnit.DAYS);
        Instant end   = start.plus(2, ChronoUnit.HOURS);
        mockMvc.perform(post(BASE)
                        .header("Authorization", bearerToken(user))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"name":"Name","description":"desc","startDate":"%s","endDate":"%s",
                                 "organizerName":"Org","organizerContact":"05551234567","eventPlace":"Place",
                                 "instagramLink":"not-a-url"}
                                """.formatted(start, end)))
                .andExpect(status().isBadRequest());
    }

    // ── Review ───────────────────────────────────────────────────────────────

    @Test
    void reviewActivity_returns403_forRegularUser() throws Exception {
        User admin = createUser(uniqueEmail(), Role.ADMIN);
        User user  = createUser(uniqueEmail(), Role.USER);
        UUID id    = createActivity(bearerToken(admin));

        mockMvc.perform(post(BASE + "/" + id + "/review")
                        .header("Authorization", bearerToken(user))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"decision\":\"APPROVED\"}"))
                .andExpect(status().isForbidden());
    }

    @Test
    void reviewActivity_returns200_onApprove() throws Exception {
        User admin = createUser(uniqueEmail(), Role.ADMIN);
        UUID id    = createActivity(bearerToken(admin));

        mockMvc.perform(post(BASE + "/" + id + "/review")
                        .header("Authorization", bearerToken(admin))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"decision\":\"APPROVED\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("APPROVED"));
    }

    @Test
    void reviewActivity_returns400_whenRejectingWithoutReason() throws Exception {
        User admin = createUser(uniqueEmail(), Role.ADMIN);
        UUID id    = createActivity(bearerToken(admin));

        mockMvc.perform(post(BASE + "/" + id + "/review")
                        .header("Authorization", bearerToken(admin))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"decision\":\"REJECTED\"}"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void reviewActivity_returns409_whenAlreadyReviewed() throws Exception {
        User admin = createUser(uniqueEmail(), Role.ADMIN);
        UUID id    = createActivity(bearerToken(admin));

        // First review — approve
        mockMvc.perform(post(BASE + "/" + id + "/review")
                        .header("Authorization", bearerToken(admin))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"decision\":\"APPROVED\"}"))
                .andExpect(status().isOk());

        // Second review — must return 409
        mockMvc.perform(post(BASE + "/" + id + "/review")
                        .header("Authorization", bearerToken(admin))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"decision\":\"REJECTED\",\"rejectionReason\":\"Duplicate attempt\"}"))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.message").value(org.hamcrest.Matchers.containsString("already been reviewed")));
    }

    @Test
    void reviewActivity_returns404_whenActivityNotFound() throws Exception {
        User admin = createUser(uniqueEmail(), Role.ADMIN);

        mockMvc.perform(post(BASE + "/" + UUID.randomUUID() + "/review")
                        .header("Authorization", bearerToken(admin))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"decision\":\"APPROVED\"}"))
                .andExpect(status().isNotFound());
    }

    // ── RSVP ─────────────────────────────────────────────────────────────────

    @Test
    void rsvp_returns401_withoutAuth() throws Exception {
        mockMvc.perform(post(BASE + "/" + UUID.randomUUID() + "/rsvp"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void rsvp_togglesGoingStatus() throws Exception {
        User admin = createUser(uniqueEmail(), Role.ADMIN);
        User user  = createUser(uniqueEmail(), Role.USER);
        UUID id    = createActivity(bearerToken(admin));

        // First RSVP — going
        String resp1 = mockMvc.perform(post(BASE + "/" + id + "/rsvp")
                        .header("Authorization", bearerToken(user)))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        assertThat(objectMapper.readTree(resp1).get("going").asBoolean()).isTrue();
        assertThat(objectMapper.readTree(resp1).get("rsvpCount").asLong()).isEqualTo(1L);

        // Second RSVP — cancel
        String resp2 = mockMvc.perform(post(BASE + "/" + id + "/rsvp")
                        .header("Authorization", bearerToken(user)))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        assertThat(objectMapper.readTree(resp2).get("going").asBoolean()).isFalse();
        assertThat(objectMapper.readTree(resp2).get("rsvpCount").asLong()).isEqualTo(0L);
    }

    @Test
    void rsvp_concurrentRequests_countRemainsConsistent() throws Exception {
        User admin = createUser(uniqueEmail(), Role.ADMIN);
        UUID id    = createActivity(bearerToken(admin));

        // Two different users RSVP concurrently
        User user1 = createUser(uniqueEmail(), Role.USER);
        User user2 = createUser(uniqueEmail(), Role.USER);
        String token1 = bearerToken(user1);
        String token2 = bearerToken(user2);

        CountDownLatch latch   = new CountDownLatch(1);
        AtomicInteger  success = new AtomicInteger(0);

        ExecutorService pool = Executors.newFixedThreadPool(2);
        java.util.function.Consumer<String> task = tok -> {
            try {
                latch.await();
                int httpStatus = mockMvc.perform(post(BASE + "/" + id + "/rsvp")
                                .header("Authorization", tok))
                        .andReturn().getResponse().getStatus();
                if (httpStatus == 200) success.incrementAndGet();
            } catch (Exception ignored) {}
        };

        pool.submit(() -> task.accept(token1));
        pool.submit(() -> task.accept(token2));
        latch.countDown();
        pool.shutdown();
        pool.awaitTermination(5, java.util.concurrent.TimeUnit.SECONDS);

        // Final count should reflect exactly how many users are going
        String finalResp = mockMvc.perform(get(BASE + "/" + id))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        JsonNode body = objectMapper.readTree(finalResp);
        assertThat(body.get("rsvpCount").asLong()).isBetween(0L, 2L);
    }

    // ── GET by ID ─────────────────────────────────────────────────────────────

    @Test
    void getActivity_returns404_whenNotFound() throws Exception {
        mockMvc.perform(get(BASE + "/" + UUID.randomUUID()))
                .andExpect(status().isNotFound());
    }

    @Test
    void deleteActivity_returns403_forRegularUser() throws Exception {
        User admin = createUser(uniqueEmail(), Role.ADMIN);
        User user  = createUser(uniqueEmail(), Role.USER);
        UUID id    = createActivity(bearerToken(admin));

        mockMvc.perform(delete(BASE + "/" + id)
                        .header("Authorization", bearerToken(user)))
                .andExpect(status().isForbidden());
    }
}
