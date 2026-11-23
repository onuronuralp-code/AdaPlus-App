package app.adaplus.backend.controller;

import app.adaplus.backend.dto.admin.BroadcastNotificationRequest;
import app.adaplus.backend.service.PushNotificationService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/admin/notifications")
@RequiredArgsConstructor
@Tag(name = "Admin - Notifications", description = "Send custom push notifications to users")
public class AdminNotificationController {

    private final PushNotificationService pushNotificationService;

    @Operation(
        summary = "[ADMIN] Broadcast push notification",
        description = "Sends a push notification to all users, or only users on a specific island if `island` is provided. Fire-and-forget — returns 204 immediately."
    )
    @PostMapping("/broadcast")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void broadcast(@Valid @RequestBody BroadcastNotificationRequest req) {
        pushNotificationService.sendBroadcast(req.title(), req.body(), req.island());
    }
}
