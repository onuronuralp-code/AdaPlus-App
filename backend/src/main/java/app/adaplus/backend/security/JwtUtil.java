package app.adaplus.backend.security;

import app.adaplus.backend.entity.Role;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.io.Decoders;
import io.jsonwebtoken.security.Keys;
import jakarta.annotation.PostConstruct;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.env.Environment;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.util.Arrays;
import java.util.Date;
import java.util.UUID;

@Component
@Slf4j
public class JwtUtil {

    private static final String DEV_DEFAULT_SECRET =
            "ZGV2LXNlY3JldC1rZXktZm9yLWFkYS1wbHVzLWJhY2tlbmQtZGV2ZWxvcG1lbnQtMjAyNA==";

    @Value("${app.jwt.secret}")
    private String secret;

    @Value("${app.jwt.expiration-ms:86400000}")
    private long expirationMs;

    private final Environment environment;

    public JwtUtil(Environment environment) {
        this.environment = environment;
    }

    @PostConstruct
    void validateSecret() {
        if (DEV_DEFAULT_SECRET.equals(secret)) {
            var profiles = Arrays.asList(environment.getActiveProfiles());
            boolean isNonProd = profiles.contains("dev") || profiles.contains("test") || profiles.contains("local");
            if (!isNonProd) {
                throw new IllegalStateException(
                        "JWT_SECRET env var is not set — the fallback default key is publicly known. " +
                        "Set JWT_SECRET to a secure random base64-encoded 256-bit value before deploying.");
            }
            log.warn("[SECURITY] Using default JWT secret — only safe in dev/test/local mode");
        }
    }

    private SecretKey key() {
        return Keys.hmacShaKeyFor(Decoders.BASE64.decode(secret));
    }

    public String generateToken(UUID userId, String email, Role role, int tokenVersion) {
        return Jwts.builder()
                .subject(userId.toString())
                .claim("email", email)
                .claim("role", role.name())
                .claim("tkv", tokenVersion)
                .issuedAt(new Date())
                .expiration(new Date(System.currentTimeMillis() + expirationMs))
                .signWith(key())
                .compact();
    }

    public int getTokenVersion(Claims claims) {
        Integer tkv = claims.get("tkv", Integer.class);
        return tkv != null ? tkv : 0;
    }

    public Claims extractClaims(String token) {
        return Jwts.parser()
                .verifyWith(key())
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }

    public boolean isValid(String token) {
        try {
            extractClaims(token);
            return true;
        } catch (JwtException | IllegalArgumentException e) {
            return false;
        }
    }
}
