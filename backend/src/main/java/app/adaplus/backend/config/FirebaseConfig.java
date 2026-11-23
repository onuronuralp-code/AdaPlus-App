package app.adaplus.backend.config;

import com.google.auth.oauth2.GoogleCredentials;
import com.google.firebase.FirebaseApp;
import com.google.firebase.FirebaseOptions;
import com.google.firebase.messaging.FirebaseMessaging;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.io.FileInputStream;
import java.io.IOException;

@Configuration
@Slf4j
public class FirebaseConfig {

    @Bean
    @ConditionalOnProperty(name = "app.firebase.enabled", havingValue = "true")
    public FirebaseApp firebaseApp(
            @Value("${app.firebase.credentials-path:}") String credentialsPath) throws IOException {

        if (!FirebaseApp.getApps().isEmpty()) {
            return FirebaseApp.getInstance();
        }

        FirebaseOptions options;
        if (!credentialsPath.isBlank()) {
            try (var stream = new FileInputStream(credentialsPath)) {
                options = FirebaseOptions.builder()
                        .setCredentials(GoogleCredentials.fromStream(stream))
                        .build();
            }
        } else {
            log.warn("No FIREBASE_CREDENTIALS_PATH set — trying Application Default Credentials");
            options = FirebaseOptions.builder()
                    .setCredentials(GoogleCredentials.getApplicationDefault())
                    .build();
        }
        return FirebaseApp.initializeApp(options);
    }

    @Bean
    @ConditionalOnProperty(name = "app.firebase.enabled", havingValue = "true")
    public FirebaseMessaging firebaseMessaging(FirebaseApp app) {
        return FirebaseMessaging.getInstance(app);
    }
}
