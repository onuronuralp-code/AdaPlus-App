package app.adaplus.backend;

import app.adaplus.backend.entity.Role;
import app.adaplus.backend.entity.User;
import app.adaplus.backend.repository.UserRepository;
import app.adaplus.backend.security.JwtUtil;
import app.adaplus.backend.service.EmailService;
import app.adaplus.backend.service.PushNotificationService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import java.util.UUID;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.MOCK)
@AutoConfigureMockMvc
@ActiveProfiles("test")
public abstract class BaseIntegrationTest {

    @Autowired protected MockMvc mockMvc;
    @Autowired protected ObjectMapper objectMapper;
    @Autowired protected UserRepository userRepository;
    @Autowired protected JwtUtil jwtUtil;
    @Autowired protected PasswordEncoder passwordEncoder;

    @MockBean protected EmailService emailService;
    @MockBean protected PushNotificationService pushNotificationService;

    protected static final String TEST_PASSWORD = "Password1!";

    protected User createUser(String email, Role role) {
        return userRepository.save(User.builder()
                .fullName("Test User")
                .email(email)
                .passwordHash(passwordEncoder.encode(TEST_PASSWORD))
                .role(role)
                .emailVerified(true)
                .phoneVerified(true)
                .kvkkAccepted(true)
                .build());
    }

    protected String bearerToken(User user) {
        return "Bearer " + jwtUtil.generateToken(
                user.getId(), user.getEmail(), user.getRole(), user.getTokenVersion());
    }

    protected String uniqueEmail() {
        return "test-" + UUID.randomUUID() + "@adaplus.test";
    }
}
