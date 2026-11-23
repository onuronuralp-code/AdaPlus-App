package app.adaplus.backend.controller;

import app.adaplus.backend.BaseIntegrationTest;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;

import static org.hamcrest.Matchers.containsString;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * Integration tests for POST /api/v1/contact.
 * No authentication required — verifies all DTO boundary conditions.
 */
class ContactControllerTest extends BaseIntegrationTest {

    private static final String BASE = "/api/v1/contact";

    private String validContact() {
        return """
                {
                  "fullName": "Ada Resident",
                  "email": "ada@example.com",
                  "message": "This is a valid test message with enough characters."
                }
                """;
    }

    // ── Happy path ────────────────────────────────────────────────────────────

    @Test
    void send_returns200_withValidRequest() throws Exception {
        mockMvc.perform(post(BASE)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(validContact()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message").exists());
    }

    @Test
    void send_returns200_withMinimalValidMessage() throws Exception {
        mockMvc.perform(post(BASE)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"fullName":"Ab Cd","email":"x@y.co","message":"Exactly10c"}
                                """))
                .andExpect(status().isOk());
    }

    @Test
    void send_returns200_withMaxLengthMessage() throws Exception {
        String maxMsg = "A".repeat(2000);
        mockMvc.perform(post(BASE)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"fullName":"Ada Resident","email":"ada@example.com","message":"%s"}
                                """.formatted(maxMsg)))
                .andExpect(status().isOk());
    }

    // ── fullName validation ───────────────────────────────────────────────────

    @Test
    void send_returns400_whenNameBlank() throws Exception {
        mockMvc.perform(post(BASE)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"fullName":"","email":"ada@example.com","message":"Valid message content here"}
                                """))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value(containsString("fullName")));
    }

    @Test
    void send_returns400_whenNameTooShort() throws Exception {
        mockMvc.perform(post(BASE)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"fullName":"A","email":"ada@example.com","message":"Valid message content here"}
                                """))
                .andExpect(status().isBadRequest());
    }

    @Test
    void send_returns400_whenNameTooLong() throws Exception {
        String longName = "A".repeat(101);
        mockMvc.perform(post(BASE)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"fullName":"%s","email":"ada@example.com","message":"Valid message content here"}
                                """.formatted(longName)))
                .andExpect(status().isBadRequest());
    }

    @Test
    void send_returns400_whenNameContainsDigits() throws Exception {
        mockMvc.perform(post(BASE)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"fullName":"Ada123","email":"ada@example.com","message":"Valid message content here"}
                                """))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value(containsString("fullName")));
    }

    @Test
    void send_returns200_whenNameContainsHyphenAndApostrophe() throws Exception {
        mockMvc.perform(post(BASE)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"fullName":"O'Brien Smith-Jones","email":"ada@example.com","message":"Valid message content here."}
                                """))
                .andExpect(status().isOk());
    }

    // ── email validation ──────────────────────────────────────────────────────

    @Test
    void send_returns400_whenEmailBlank() throws Exception {
        mockMvc.perform(post(BASE)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"fullName":"Ada Resident","email":"","message":"Valid message content here"}
                                """))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value(containsString("email")));
    }

    @Test
    void send_returns400_whenEmailInvalid() throws Exception {
        mockMvc.perform(post(BASE)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"fullName":"Ada Resident","email":"notanemail","message":"Valid message content here"}
                                """))
                .andExpect(status().isBadRequest());
    }

    @Test
    void send_returns400_whenEmailTooLong() throws Exception {
        String longEmail = "a".repeat(244) + "@example.com"; // > 255 chars
        mockMvc.perform(post(BASE)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"fullName":"Ada Resident","email":"%s","message":"Valid message content here"}
                                """.formatted(longEmail)))
                .andExpect(status().isBadRequest());
    }

    @Test
    void send_returns400_whenEmailMissingDomain() throws Exception {
        mockMvc.perform(post(BASE)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"fullName":"Ada Resident","email":"user@","message":"Valid message content here"}
                                """))
                .andExpect(status().isBadRequest());
    }

    // ── message validation ────────────────────────────────────────────────────

    @Test
    void send_returns400_whenMessageBlank() throws Exception {
        mockMvc.perform(post(BASE)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"fullName":"Ada Resident","email":"ada@example.com","message":""}
                                """))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value(containsString("message")));
    }

    @Test
    void send_returns400_whenMessageTooShort() throws Exception {
        mockMvc.perform(post(BASE)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"fullName":"Ada Resident","email":"ada@example.com","message":"Short"}
                                """))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value(containsString("message")));
    }

    @Test
    void send_returns400_whenMessageTooLong() throws Exception {
        String longMsg = "A".repeat(2001);
        mockMvc.perform(post(BASE)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"fullName":"Ada Resident","email":"ada@example.com","message":"%s"}
                                """.formatted(longMsg)))
                .andExpect(status().isBadRequest());
    }

    // ── Payload edge cases ────────────────────────────────────────────────────

    @Test
    void send_returns400_withEmptyPayload() throws Exception {
        mockMvc.perform(post(BASE)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void send_returns400_withNullValues() throws Exception {
        mockMvc.perform(post(BASE)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"fullName":null,"email":null,"message":null}
                                """))
                .andExpect(status().isBadRequest());
    }
}
