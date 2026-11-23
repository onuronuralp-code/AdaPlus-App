package app.adaplus.backend.security;

import app.adaplus.backend.filter.AdminAccessFilter;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.web.servlet.FilterRegistrationBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import jakarta.servlet.DispatcherType;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

import java.time.Instant;
import java.util.Map;

@Configuration
@EnableWebSecurity
@RequiredArgsConstructor
public class SecurityConfig {

    private final JwtAuthFilter jwtAuthFilter;
    private final AdminAccessFilter adminAccessFilter;
    private final ObjectMapper objectMapper;

    // Prevent Spring Boot from auto-registering AdminAccessFilter in the outer
    // servlet filter chain — it runs inside Spring Security's chain instead.
    @Bean
    FilterRegistrationBean<AdminAccessFilter> adminFilterRegistration(AdminAccessFilter f) {
        FilterRegistrationBean<AdminAccessFilter> reg = new FilterRegistrationBean<>(f);
        reg.setEnabled(false);
        return reg;
    }

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
                .csrf(AbstractHttpConfigurer::disable)
                .sessionManagement(sm -> sm.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .cors(cors -> cors.configure(http))
                .headers(headers -> headers
                        .frameOptions(fo -> fo.sameOrigin())
                        .httpStrictTransportSecurity(hsts -> hsts
                                .maxAgeInSeconds(31536000)
                                .includeSubDomains(true)
                        )
                )
                .authorizeHttpRequests(auth -> auth
                        // Async dispatches (SSE/SseEmitter completion) must not be re-authenticated
                        .dispatcherTypeMatchers(DispatcherType.ASYNC).permitAll()
                        // Admin review UI (static HTML — security enforced by API calls)
                        .requestMatchers("/admin/**").permitAll()
                        // One-click approve/decline from admin notification emails (HMAC-secured)
                        .requestMatchers("/api/v1/admin/email-review").permitAll()
                        // H2 console access is profile-gated in LocalSecurityConfig (@Profile("local"))
                        // Swagger UI
                        .requestMatchers("/swagger-ui/**", "/v3/api-docs/**", "/swagger-ui.html").permitAll()
                        // Public — auth endpoints (except /refresh which requires a valid JWT)
                        .requestMatchers(HttpMethod.POST, "/api/v1/auth/refresh").authenticated()
                        .requestMatchers(HttpMethod.POST, "/api/v1/auth/logout").authenticated()
                        .requestMatchers("/api/v1/auth/**").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/v1/app/version").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/v1/banners/active").permitAll()
                        .requestMatchers("/api/v1/banners/**").hasRole("ADMIN")
                        .requestMatchers(HttpMethod.GET, "/api/v1/popups/active").permitAll()
                        .requestMatchers("/api/v1/popups/**").hasRole("ADMIN")
                        .requestMatchers("/api/v1/admin/notifications/**").hasRole("ADMIN")
                        .requestMatchers("/api/v1/admin/forum/**").hasRole("ADMIN")
                        .requestMatchers(HttpMethod.POST, "/api/v1/contact").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/v1/travel/**", "/api/v1/buses/**").permitAll()
                        // Admin only — pending queues (must come BEFORE the public wildcards below)
                        .requestMatchers(HttpMethod.GET, "/api/v1/activities/pending").hasRole("ADMIN")
                        .requestMatchers(HttpMethod.GET, "/api/v1/listings/pending").hasRole("ADMIN")
                        .requestMatchers(HttpMethod.GET, "/api/v1/provider-applications/pending").hasRole("ADMIN")
                        // Public — read activities
                        .requestMatchers(HttpMethod.GET, "/api/v1/activities", "/api/v1/activities/**").permitAll()
                        // Public — read forum posts, replies, topics
                        .requestMatchers(HttpMethod.GET, "/api/v1/forum/**").permitAll()
                        // Public — read user posts, replies, likes, and count
                        .requestMatchers(HttpMethod.GET, "/api/v1/users/*/posts", "/api/v1/users/*/replies", "/api/v1/users/*/likes").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/v1/users/count").permitAll()
                        // Public — serve uploaded media; upload itself requires auth
                        .requestMatchers(HttpMethod.GET, "/api/v1/media/**", "/uploads/**").permitAll()
                        .requestMatchers(HttpMethod.POST, "/api/v1/media/upload").authenticated()
                        // Public — read listings
                        .requestMatchers(HttpMethod.GET, "/api/v1/listings", "/api/v1/listings/**").permitAll()
                        // Authenticated — AI guide chat (stores user message for analytics)
                        .requestMatchers(HttpMethod.POST, "/api/v1/guide/chat", "/api/v1/guide/chat/stream").authenticated()
                        // Demand surveys — vote requires auth; stats are admin-only
                        .requestMatchers(HttpMethod.POST, "/api/v1/demand/**").authenticated()
                        .requestMatchers(HttpMethod.GET, "/api/v1/demand/**").hasRole("ADMIN")
                        // Authenticated — submit a delivery order (residency gate enforced in service)
                        .requestMatchers(HttpMethod.POST, "/api/v1/delivery/orders").authenticated()
                        // Authenticated users — submit listings and activities for review
                        .requestMatchers(HttpMethod.POST, "/api/v1/listings").authenticated()
                        // Admin only — review listings (must come BEFORE the general PUT/DELETE below)
                        .requestMatchers(HttpMethod.POST, "/api/v1/listings/*/review").hasRole("ADMIN")
                        // Authenticated users — manage listings (update is owner-checked in service, delete is owner-checked in service)
                        .requestMatchers(HttpMethod.PUT, "/api/v1/listings/**").authenticated()
                        .requestMatchers(HttpMethod.DELETE, "/api/v1/listings/**").authenticated()
                        // Admin only — delete topics
                        .requestMatchers(HttpMethod.DELETE, "/api/v1/forum/topics/**").hasRole("ADMIN")
                        // Poll voting requires auth (POST /forum/polls/**)
                        .requestMatchers(HttpMethod.POST, "/api/v1/forum/polls/**").authenticated()
                        // Authenticated users — manage and review activities
                        .requestMatchers(HttpMethod.POST, "/api/v1/activities").authenticated()
                        .requestMatchers(HttpMethod.POST, "/api/v1/activities/*/review").hasRole("ADMIN")
                        .requestMatchers(HttpMethod.POST, "/api/v1/activities/*/rsvp").authenticated()
                        // Authenticated — owners can edit/delete their own activities (service enforces ownership)
                        .requestMatchers(HttpMethod.PUT, "/api/v1/activities/**").authenticated()
                        .requestMatchers(HttpMethod.DELETE, "/api/v1/activities/**").authenticated()
                        // Authenticated users — apply as a service provider, check own applications
                        .requestMatchers(HttpMethod.POST, "/api/v1/provider-applications").authenticated()
                        .requestMatchers(HttpMethod.GET, "/api/v1/provider-applications/me").authenticated()
                        .requestMatchers(HttpMethod.POST, "/api/v1/provider-applications/*/review").hasRole("ADMIN")
                        // Authenticated — ferry alarms (create, list, delete)
                        .requestMatchers("/api/v1/alarms", "/api/v1/alarms/**").authenticated()
                        // Authenticated — register/remove push notification tokens
                        .requestMatchers("/api/v1/users/device-tokens").authenticated()
                        // Authenticated — island residents (and admins) can send invites
                        .requestMatchers(HttpMethod.POST, "/api/v1/users/invites").authenticated()
                        // Authenticated — delete own account (must come before the admin {id} rule)
                        .requestMatchers(HttpMethod.DELETE, "/api/v1/users/me").authenticated()
                        // Admin only — delete any user
                        .requestMatchers(HttpMethod.DELETE, "/api/v1/users/{id}").hasRole("ADMIN")
                        // Actuator — health and info are public; metrics/caches require admin
                        .requestMatchers("/actuator/health", "/actuator/info").permitAll()
                        .requestMatchers("/actuator/**").hasRole("ADMIN")
                        // Everything else requires a valid JWT
                        .anyRequest().authenticated()
                )
                .addFilterBefore(adminAccessFilter, UsernamePasswordAuthenticationFilter.class)
                .addFilterBefore(jwtAuthFilter, UsernamePasswordAuthenticationFilter.class)
                .exceptionHandling(ex -> ex
                        .authenticationEntryPoint((req, res, e) ->
                                writeError(res, HttpServletResponse.SC_UNAUTHORIZED, "Unauthorized", "Authentication required"))
                        .accessDeniedHandler((req, res, e) ->
                                writeError(res, HttpServletResponse.SC_FORBIDDEN, "Forbidden", "Access denied"))
                );

        return http.build();
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder(12);
    }

    private void writeError(HttpServletResponse response, int status, String error, String message) {
        response.setStatus(status);
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        try {
            objectMapper.writeValue(response.getWriter(), Map.of(
                    "status", status,
                    "error", error,
                    "message", message,
                    "timestamp", Instant.now().toString()
            ));
        } catch (Exception ignored) {
        }
    }
}
