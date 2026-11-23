package app.adaplus.backend.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.Instant;
import java.util.Base64;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Pure unit tests for AdminTokenService — no Spring context needed.
 * Exercises HMAC token generation, validation, expiry, and tamper detection.
 */
class AdminTokenServiceTest {

    private AdminTokenService service;
    private static final String SECRET = "test-hmac-secret-for-unit-tests";
    private static final UUID SAMPLE_ID = UUID.fromString("00000000-0000-0000-0000-000000000001");

    @BeforeEach
    void setUp() {
        service = new AdminTokenService();
        ReflectionTestUtils.setField(service, "secret", SECRET);
    }

    @Test
    void generateToken_returnsNonEmpty_whenSecretConfigured() {
        String token = service.generateToken("activity", SAMPLE_ID);
        assertThat(token).isNotBlank();
        assertThat(token).contains(".");
    }

    @Test
    void generateToken_returnsEmpty_whenSecretBlank() {
        ReflectionTestUtils.setField(service, "secret", "");
        String token = service.generateToken("activity", SAMPLE_ID);
        assertThat(token).isEmpty();
    }

    @Test
    void validateToken_returnsTrue_forValidToken() {
        String token = service.generateToken("activity", SAMPLE_ID);
        assertThat(service.validateToken(token, "activity", SAMPLE_ID)).isTrue();
    }

    @Test
    void validateToken_returnsFalse_forWrongType() {
        String token = service.generateToken("activity", SAMPLE_ID);
        assertThat(service.validateToken(token, "listing", SAMPLE_ID)).isFalse();
    }

    @Test
    void validateToken_returnsFalse_forWrongId() {
        String token = service.generateToken("activity", SAMPLE_ID);
        UUID otherId = UUID.fromString("00000000-0000-0000-0000-000000000002");
        assertThat(service.validateToken(token, "activity", otherId)).isFalse();
    }

    @Test
    void validateToken_returnsFalse_whenSecretBlank() {
        String token = service.generateToken("activity", SAMPLE_ID);
        ReflectionTestUtils.setField(service, "secret", "");
        assertThat(service.validateToken(token, "activity", SAMPLE_ID)).isFalse();
    }

    @Test
    void validateToken_returnsFalse_forNullToken() {
        assertThat(service.validateToken(null, "activity", SAMPLE_ID)).isFalse();
    }

    @Test
    void validateToken_returnsFalse_forBlankToken() {
        assertThat(service.validateToken("   ", "activity", SAMPLE_ID)).isFalse();
    }

    @Test
    void validateToken_returnsFalse_forTamperedHmac() {
        String token = service.generateToken("activity", SAMPLE_ID);
        // Flip the last character of the HMAC
        String tampered = token.substring(0, token.length() - 1) + "X";
        assertThat(service.validateToken(tampered, "activity", SAMPLE_ID)).isFalse();
    }

    @Test
    void validateToken_returnsFalse_forTamperedPayload() {
        // Build a token with a different type but keep the original HMAC
        String original = service.generateToken("activity", SAMPLE_ID);
        int dot = original.lastIndexOf('.');
        String originalHmac = original.substring(dot + 1);

        // Re-encode payload with type="listing" but keep the original HMAC
        String fakeData = "listing:" + SAMPLE_ID + ":" + Instant.now().plusSeconds(3600).getEpochSecond();
        String fakeEncoded = Base64.getUrlEncoder().withoutPadding()
                .encodeToString(fakeData.getBytes(java.nio.charset.StandardCharsets.UTF_8));
        String tampered = fakeEncoded + "." + originalHmac;

        assertThat(service.validateToken(tampered, "listing", SAMPLE_ID)).isFalse();
    }

    @Test
    void validateToken_returnsFalse_forExpiredToken() throws Exception {
        // Generate a token, then backdating is not directly possible, so we build one manually
        // by crafting a data string with an already-past expiry and signing it.
        long pastExpiry = Instant.now().minusSeconds(1).getEpochSecond();
        String data = "activity:" + SAMPLE_ID + ":" + pastExpiry;
        String encoded = Base64.getUrlEncoder().withoutPadding()
                .encodeToString(data.getBytes(java.nio.charset.StandardCharsets.UTF_8));

        // Compute HMAC via reflection on the service's hmac method
        java.lang.reflect.Method hmacMethod = AdminTokenService.class.getDeclaredMethod("hmac", String.class);
        hmacMethod.setAccessible(true);
        String hmac = (String) hmacMethod.invoke(service, data);

        String expiredToken = encoded + "." + hmac;
        assertThat(service.validateToken(expiredToken, "activity", SAMPLE_ID)).isFalse();
    }

    @Test
    void validateToken_returnsFalse_forMalformedToken_noDot() {
        assertThat(service.validateToken("nodottoken", "activity", SAMPLE_ID)).isFalse();
    }

    @Test
    void validateToken_returnsFalse_forMalformedToken_wrongPartCount() {
        // Encode only 2 parts instead of 3
        String data = "activity:" + SAMPLE_ID; // missing expiry part
        String encoded = Base64.getUrlEncoder().withoutPadding()
                .encodeToString(data.getBytes(java.nio.charset.StandardCharsets.UTF_8));
        assertThat(service.validateToken(encoded + ".fakhmac", "activity", SAMPLE_ID)).isFalse();
    }
}
