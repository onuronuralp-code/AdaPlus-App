package app.adaplus.backend.filter;

import com.github.benmanes.caffeine.cache.Cache;
import com.github.benmanes.caffeine.cache.Caffeine;
import io.github.bucket4j.Bandwidth;
import io.github.bucket4j.Bucket;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Profile;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.time.Duration;
import java.util.concurrent.TimeUnit;

@Component
@Profile("!dev")
public class RateLimitFilter extends OncePerRequestFilter {

    private final int requestsPerMinute;
    private final int burstCapacity;
    // Caffeine cache prevents unbounded memory growth — evicts inactive IPs after 10 minutes
    private final Cache<String, Bucket> buckets = Caffeine.newBuilder()
            .expireAfterAccess(10, TimeUnit.MINUTES)
            .maximumSize(50_000)
            .build();

    public RateLimitFilter(
            @Value("${rate-limit.requests-per-minute:60}") int requestsPerMinute,
            @Value("${rate-limit.burst-capacity:20}") int burstCapacity) {
        this.requestsPerMinute = requestsPerMinute;
        this.burstCapacity = burstCapacity;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain)
            throws ServletException, IOException {

        String clientIp = resolveClientIp(request);
        Bucket bucket = buckets.get(clientIp, this::createBucket);

        if (bucket.tryConsume(1)) {
            long remaining = bucket.getAvailableTokens();
            response.setHeader("X-RateLimit-Remaining", String.valueOf(remaining));
            filterChain.doFilter(request, response);
        } else {
            response.setStatus(HttpStatus.TOO_MANY_REQUESTS.value());
            response.setContentType("application/json");
            response.getWriter().write("""
                    {"error": "Too many requests", "status": 429, "message": "Rate limit exceeded. Try again shortly."}
                    """);
        }
    }

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        String path = request.getRequestURI();
        return path.startsWith("/actuator") || path.startsWith("/h2-console");
    }

    private Bucket createBucket(String key) {
        Bandwidth limit = Bandwidth.builder()
                .capacity(burstCapacity)
                .refillGreedy(requestsPerMinute, Duration.ofMinutes(1))
                .build();
        return Bucket.builder().addLimit(limit).build();
    }

    private String resolveClientIp(HttpServletRequest request) {
        String remoteAddr = request.getRemoteAddr();
        // Only trust proxy-injected headers when the TCP peer is a known trusted proxy
        // (loopback or private network ranges). Accepting these headers from arbitrary
        // clients would let attackers supply fake IPs and bypass per-IP rate limiting.
        if (isTrustedProxy(remoteAddr)) {
            String realIp = request.getHeader("X-Real-IP");
            if (realIp != null && !realIp.isBlank()) return realIp.trim();
            String xff = request.getHeader("X-Forwarded-For");
            if (xff != null && !xff.isBlank()) return xff.split(",")[0].trim();
        }
        return remoteAddr;
    }

    private boolean isTrustedProxy(String remoteAddr) {
        if (remoteAddr == null) return false;
        return remoteAddr.equals("127.0.0.1")
                || remoteAddr.equals("::1")
                || remoteAddr.startsWith("10.")
                || remoteAddr.startsWith("172.16.") || remoteAddr.startsWith("172.17.")
                || remoteAddr.startsWith("172.18.") || remoteAddr.startsWith("172.19.")
                || remoteAddr.startsWith("172.20.") || remoteAddr.startsWith("172.21.")
                || remoteAddr.startsWith("172.22.") || remoteAddr.startsWith("172.23.")
                || remoteAddr.startsWith("172.24.") || remoteAddr.startsWith("172.25.")
                || remoteAddr.startsWith("172.26.") || remoteAddr.startsWith("172.27.")
                || remoteAddr.startsWith("172.28.") || remoteAddr.startsWith("172.29.")
                || remoteAddr.startsWith("172.30.") || remoteAddr.startsWith("172.31.")
                || remoteAddr.startsWith("192.168.");
    }
}
