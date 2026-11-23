package app.adaplus.backend.service;

import app.adaplus.backend.entity.DeviceToken;
import app.adaplus.backend.repository.DeviceTokenRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.google.firebase.messaging.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Slice;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
@Slf4j
@RequiredArgsConstructor
public class PushNotificationService {

    private final DeviceTokenRepository deviceTokenRepository;
    private final ObjectMapper objectMapper;

    @Autowired(required = false)
    private FirebaseMessaging firebaseMessaging;

    @Value("${app.firebase.enabled:false}")
    private boolean firebaseEnabled;

    private final HttpClient httpClient = HttpClient.newHttpClient();

    public void sendToUser(UUID userId, String title, String body) {
        List<DeviceToken> tokens = deviceTokenRepository.findByUserId(userId);
        if (tokens.isEmpty()) {
            log.info("No device tokens for user {} — push skipped", userId);
            return;
        }
        for (DeviceToken dt : tokens) {
            if (dt.getToken().startsWith("ExponentPushToken[")) {
                sendViaExpo(dt, title, body);
            } else if (firebaseEnabled && firebaseMessaging != null) {
                sendViaFirebase(dt, title, body);
            } else {
                log.info("[DEV] Push (Firebase disabled) to user {}: title='{}', body='{}'", userId, title, body);
            }
        }
    }

    private void sendViaExpo(DeviceToken dt, String title, String body) {
        try {
            String payload = objectMapper.writeValueAsString(Map.of(
                    "to", dt.getToken(),
                    "title", title,
                    "body", body,
                    "sound", "default"
            ));
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create("https://exp.host/--/api/v2/push/send"))
                    .header("Content-Type", "application/json")
                    .header("Accept", "application/json")
                    .POST(HttpRequest.BodyPublishers.ofString(payload))
                    .build();
            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() == 200) {
                log.info("Expo push sent to user {}: {}", dt.getUser().getId(), response.body());
            } else {
                log.error("Expo push failed for user {}: {} {}", dt.getUser().getId(), response.statusCode(), response.body());
            }
        } catch (Exception e) {
            log.error("Expo push exception for user {}: {}", dt.getUser().getId(), e.getMessage());
        }
    }

    @Async
    public void sendBroadcast(String title, String body, String island) {
        // Process in chunks of 200 so the entire device token table is never
        // held in heap simultaneously. A single List<DeviceToken> across all users
        // can easily reach tens of MB under scale.
        int page = 0;
        int chunkSize = 200;
        int totalSent = 0;

        while (true) {
            PageRequest pageRequest = PageRequest.of(page, chunkSize);
            Slice<DeviceToken> slice = (island != null && !island.isBlank())
                    ? deviceTokenRepository.findByUserIsland(island, pageRequest)
                    : deviceTokenRepository.findAllWithUser(pageRequest);

            for (DeviceToken dt : slice) {
                if (dt.getToken().startsWith("ExponentPushToken[")) {
                    sendViaExpo(dt, title, body);
                } else if (firebaseEnabled && firebaseMessaging != null) {
                    sendViaFirebase(dt, title, body);
                } else {
                    log.info("[DEV] Broadcast push (disabled) to user {}: '{}'", dt.getUser().getId(), title);
                }
                totalSent++;
            }

            if (!slice.hasNext()) break;
            page++;
        }

        log.info("[BROADCAST] Done sending '{}' to {} devices (island={})", title, totalSent, island);
    }

    private void sendViaFirebase(DeviceToken dt, String title, String body) {
        Message message = Message.builder()
                .setToken(dt.getToken())
                .setNotification(Notification.builder()
                        .setTitle(title)
                        .setBody(body)
                        .build())
                .build();
        try {
            firebaseMessaging.send(message);
            log.info("Firebase push sent to user {}", dt.getUser().getId());
        } catch (FirebaseMessagingException e) {
            if (e.getMessagingErrorCode() == MessagingErrorCode.UNREGISTERED
                    || e.getMessagingErrorCode() == MessagingErrorCode.INVALID_ARGUMENT) {
                deviceTokenRepository.delete(dt);
                log.info("Removed stale FCM token for user {}", dt.getUser().getId());
            } else {
                log.error("FCM error for user {}: {}", dt.getUser().getId(), e.getMessage());
            }
        }
    }
}
