package app.adaplus.backend.controller;

import app.adaplus.backend.BaseIntegrationTest;
import app.adaplus.backend.entity.Role;
import app.adaplus.backend.entity.User;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;

import java.util.UUID;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

class ListingControllerTest extends BaseIntegrationTest {

    private static final String BASE = "/api/v1/listings";

    private String validListingJson() {
        return """
                {
                  "title": "Ada'da Satılık Bisiklet",
                  "description": "İyi durumda, az kullanılmış dağ bisikleti.",
                  "category": "SATILIK",
                  "island": "BUYUKADA",
                  "price": 500.00,
                  "contactInfo": "05551234567",
                  "active": true
                }
                """;
    }

    private UUID createListing(String token) throws Exception {
        String body = mockMvc.perform(post(BASE)
                        .header("Authorization", token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(validListingJson()))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        return UUID.fromString(objectMapper.readTree(body).get("id").asText());
    }

    // ── Auth & access ────────────────────────────────────────────────────────

    @Test
    void createListing_returns401_withoutAuth() throws Exception {
        mockMvc.perform(post(BASE)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(validListingJson()))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void createListing_returns201_withAuthenticatedUser() throws Exception {
        User user = createUser(uniqueEmail(), Role.USER);
        mockMvc.perform(post(BASE)
                        .header("Authorization", bearerToken(user))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(validListingJson()))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").exists())
                .andExpect(jsonPath("$.status").value("PENDING"));
    }

    @Test
    void getPendingListings_returns403_forRegularUser() throws Exception {
        User user = createUser(uniqueEmail(), Role.USER);
        mockMvc.perform(get(BASE + "/pending")
                        .header("Authorization", bearerToken(user)))
                .andExpect(status().isForbidden());
    }

    @Test
    void getPendingListings_returns200_forAdmin() throws Exception {
        User admin = createUser(uniqueEmail(), Role.ADMIN);
        mockMvc.perform(get(BASE + "/pending")
                        .header("Authorization", bearerToken(admin)))
                .andExpect(status().isOk());
    }

    // ── Validation ───────────────────────────────────────────────────────────

    @Test
    void createListing_returns400_whenTitleBlank() throws Exception {
        User user = createUser(uniqueEmail(), Role.USER);
        mockMvc.perform(post(BASE)
                        .header("Authorization", bearerToken(user))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"title":"","description":"desc","category":"SATILIK",
                                 "island":"BUYUKADA","contactInfo":"05551234567","active":true}
                                """))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value(org.hamcrest.Matchers.containsString("title")));
    }

    @Test
    void createListing_returns400_whenTitleExceeds255Chars() throws Exception {
        User user = createUser(uniqueEmail(), Role.USER);
        mockMvc.perform(post(BASE)
                        .header("Authorization", bearerToken(user))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"title":"%s","description":"desc","category":"SATILIK",
                                 "island":"BUYUKADA","contactInfo":"05551234567","active":true}
                                """.formatted("A".repeat(256))))
                .andExpect(status().isBadRequest());
    }

    @Test
    void createListing_returns400_whenContactInfoNotElevenDigits() throws Exception {
        User user = createUser(uniqueEmail(), Role.USER);
        // 10 digits — too short
        mockMvc.perform(post(BASE)
                        .header("Authorization", bearerToken(user))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"title":"Title","description":"desc","category":"SATILIK",
                                 "island":"BUYUKADA","contactInfo":"0555123456","active":true}
                                """))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value(org.hamcrest.Matchers.containsString("contactInfo")));
    }

    @Test
    void createListing_returns400_whenContactInfoContainsLetters() throws Exception {
        User user = createUser(uniqueEmail(), Role.USER);
        mockMvc.perform(post(BASE)
                        .header("Authorization", bearerToken(user))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"title":"Title","description":"desc","category":"SATILIK",
                                 "island":"BUYUKADA","contactInfo":"0555ABCDEFG","active":true}
                                """))
                .andExpect(status().isBadRequest());
    }

    @Test
    void createListing_returns400_whenContactInfoTooLong() throws Exception {
        User user = createUser(uniqueEmail(), Role.USER);
        // 12 digits — too long
        mockMvc.perform(post(BASE)
                        .header("Authorization", bearerToken(user))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"title":"Title","description":"desc","category":"SATILIK",
                                 "island":"BUYUKADA","contactInfo":"055512345678","active":true}
                                """))
                .andExpect(status().isBadRequest());
    }

    @Test
    void createListing_returns400_whenPriceNegative() throws Exception {
        User user = createUser(uniqueEmail(), Role.USER);
        mockMvc.perform(post(BASE)
                        .header("Authorization", bearerToken(user))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"title":"Title","description":"desc","category":"SATILIK",
                                 "island":"BUYUKADA","price":-1.00,"contactInfo":"05551234567","active":true}
                                """))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value(org.hamcrest.Matchers.containsString("price")));
    }

    @Test
    void createListing_returns400_whenCategoryNull() throws Exception {
        User user = createUser(uniqueEmail(), Role.USER);
        mockMvc.perform(post(BASE)
                        .header("Authorization", bearerToken(user))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"title":"Title","description":"desc","island":"BUYUKADA",
                                 "contactInfo":"05551234567","active":true}
                                """))
                .andExpect(status().isBadRequest());
    }

    @Test
    void createListing_returns400_whenIslandNull() throws Exception {
        User user = createUser(uniqueEmail(), Role.USER);
        mockMvc.perform(post(BASE)
                        .header("Authorization", bearerToken(user))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"title":"Title","description":"desc","category":"SATILIK",
                                 "contactInfo":"05551234567","active":true}
                                """))
                .andExpect(status().isBadRequest());
    }

    @Test
    void createListing_returns400_withInvalidCategoryValue() throws Exception {
        User user = createUser(uniqueEmail(), Role.USER);
        mockMvc.perform(post(BASE)
                        .header("Authorization", bearerToken(user))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"title":"Title","description":"desc","category":"INVALID_CATEGORY",
                                 "island":"BUYUKADA","contactInfo":"05551234567","active":true}
                                """))
                .andExpect(status().isBadRequest());
    }

    @Test
    void createListing_returns400_withEmptyPayload() throws Exception {
        User user = createUser(uniqueEmail(), Role.USER);
        mockMvc.perform(post(BASE)
                        .header("Authorization", bearerToken(user))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isBadRequest());
    }

    // ── Review ───────────────────────────────────────────────────────────────

    @Test
    void reviewListing_returns403_forRegularUser() throws Exception {
        User admin = createUser(uniqueEmail(), Role.ADMIN);
        User user  = createUser(uniqueEmail(), Role.USER);
        UUID id    = createListing(bearerToken(admin));

        mockMvc.perform(post(BASE + "/" + id + "/review")
                        .header("Authorization", bearerToken(user))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"decision\":\"APPROVED\"}"))
                .andExpect(status().isForbidden());
    }

    @Test
    void reviewListing_returns200_onApprove() throws Exception {
        User admin = createUser(uniqueEmail(), Role.ADMIN);
        UUID id    = createListing(bearerToken(admin));

        mockMvc.perform(post(BASE + "/" + id + "/review")
                        .header("Authorization", bearerToken(admin))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"decision\":\"APPROVED\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("APPROVED"));
    }

    @Test
    void reviewListing_returns200_onRejectWithReason() throws Exception {
        User admin = createUser(uniqueEmail(), Role.ADMIN);
        UUID id    = createListing(bearerToken(admin));

        mockMvc.perform(post(BASE + "/" + id + "/review")
                        .header("Authorization", bearerToken(admin))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"decision\":\"REJECTED\",\"rejectionReason\":\"Uygunsuz icerik\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("REJECTED"));
    }

    @Test
    void reviewListing_returns400_whenRejectingWithoutReason() throws Exception {
        User admin = createUser(uniqueEmail(), Role.ADMIN);
        UUID id    = createListing(bearerToken(admin));

        mockMvc.perform(post(BASE + "/" + id + "/review")
                        .header("Authorization", bearerToken(admin))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"decision\":\"REJECTED\"}"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void reviewListing_returns409_whenAlreadyReviewed() throws Exception {
        User admin = createUser(uniqueEmail(), Role.ADMIN);
        UUID id    = createListing(bearerToken(admin));

        mockMvc.perform(post(BASE + "/" + id + "/review")
                        .header("Authorization", bearerToken(admin))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"decision\":\"APPROVED\"}"))
                .andExpect(status().isOk());

        // Second review must return 409
        mockMvc.perform(post(BASE + "/" + id + "/review")
                        .header("Authorization", bearerToken(admin))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"decision\":\"REJECTED\",\"rejectionReason\":\"Tekrar deneme\"}"))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.message").value(org.hamcrest.Matchers.containsString("already been reviewed")));
    }

    // ── GET / not-found ───────────────────────────────────────────────────────

    @Test
    void getListing_returns404_whenNotFound() throws Exception {
        mockMvc.perform(get(BASE + "/" + UUID.randomUUID()))
                .andExpect(status().isNotFound());
    }

    @Test
    void getListings_returns200_publicEndpoint() throws Exception {
        mockMvc.perform(get(BASE))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content").isArray());
    }
}
