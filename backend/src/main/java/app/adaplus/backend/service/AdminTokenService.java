package app.adaplus.backend.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Instant;
import java.util.Base64;
import java.util.HexFormat;
import java.util.UUID;

@Service
@Slf4j
public class AdminTokenService {

    @Value("${app.admin.review-secret:}")
    private String secret;

    private static final long EXPIRY_SECONDS = 7L * 24 * 3600;

    public String generateToken(String type, UUID id) {
        if (secret.isBlank()) {
            log.warn("[AdminToken] ADMIN_REVIEW_SECRET not configured — review tokens disabled");
            return "";
        }
        long expiresAt = Instant.now().plusSeconds(EXPIRY_SECONDS).getEpochSecond();
        String data = type + ":" + id + ":" + expiresAt;
        return Base64.getUrlEncoder().withoutPadding()
                .encodeToString(data.getBytes(StandardCharsets.UTF_8)) + "." + hmac(data);
    }

    public boolean validateToken(String token, String expectedType, UUID expectedId) {
        if (secret.isBlank() || token == null || token.isBlank()) return false;
        try {
            int dot = token.lastIndexOf('.');
            if (dot < 0) return false;
            String encodedData = token.substring(0, dot);
            String providedHmac = token.substring(dot + 1);
            String data = new String(Base64.getUrlDecoder().decode(encodedData), StandardCharsets.UTF_8);
            String[] parts = data.split(":");
            if (parts.length != 3) return false;
            if (!expectedType.equals(parts[0])) return false;
            if (!expectedId.toString().equals(parts[1])) return false;
            long expiresAt = Long.parseLong(parts[2]);
            if (Instant.now().getEpochSecond() > expiresAt) return false;
            return MessageDigest.isEqual(
                    providedHmac.getBytes(StandardCharsets.UTF_8),
                    hmac(data).getBytes(StandardCharsets.UTF_8));
        } catch (Exception e) {
            log.warn("[AdminToken] Validation failed: {}", e.getMessage());
            return false;
        }
    }

    private String hmac(String data) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
            return HexFormat.of().formatHex(mac.doFinal(data.getBytes(StandardCharsets.UTF_8)));
        } catch (Exception e) {
            throw new IllegalStateException("HMAC failed", e);
        }
    }
}
