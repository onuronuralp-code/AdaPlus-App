package app.adaplus.backend.controller;

import app.adaplus.backend.dto.notification.RegisterDeviceTokenRequest;
import app.adaplus.backend.entity.DeviceToken;
import app.adaplus.backend.entity.User;
import app.adaplus.backend.repository.DeviceTokenRepository;
import app.adaplus.backend.repository.UserRepository;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1/users/device-tokens")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "Device Tokens", description = "Register and remove FCM push notification tokens.")
public class DeviceTokenController {

    private final DeviceTokenRepository deviceTokenRepository;
    private final UserRepository userRepository;

    @Operation(summary = "Register FCM token", description = "Call after login or when FCM refreshes the token.")
    @PostMapping
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void register(@Valid @RequestBody RegisterDeviceTokenRequest req,
                         @AuthenticationPrincipal String userId) {
        User user = userRepository.getReferenceById(UUID.fromString(userId));
        deviceTokenRepository.findByToken(req.token())
                .ifPresentOrElse(
                        existing -> {
                            if (!existing.getUser().getId().toString().equals(userId)) {
                                // Same device logged into a different account — move the token to the new owner
                                existing.setUser(user);
                                deviceTokenRepository.save(existing);
                                log.info("Reassigned {} device token to user {}: {}",
                                        req.platform(), userId, req.token());
                            } else {
                                log.info("Device token already registered for user {}", userId);
                            }
                        },
                        () -> {
                            deviceTokenRepository.save(DeviceToken.builder()
                                    .user(user)
                                    .token(req.token())
                                    .platform(req.platform())
                                    .build());
                            log.info("Registered {} device token for user {}: {}",
                                    req.platform(), userId, req.token());
                        }
                );
    }

    @Operation(summary = "Remove FCM token", description = "Call on logout or when the device should stop receiving notifications.")
    @DeleteMapping
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void remove(@RequestParam String token,
                       @AuthenticationPrincipal String userId) {
        deviceTokenRepository.findByToken(token)
                .filter(dt -> dt.getUser().getId().toString().equals(userId))
                .ifPresent(deviceTokenRepository::delete);
    }
}
