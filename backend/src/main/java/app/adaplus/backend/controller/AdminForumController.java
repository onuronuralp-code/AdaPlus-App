package app.adaplus.backend.controller;

import app.adaplus.backend.config.ForumToggle;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/v1/admin/forum")
@RequiredArgsConstructor
@Tag(name = "Admin - Forum", description = "Runtime forum kill-switch")
public class AdminForumController {

    private final ForumToggle forumToggle;

    @Operation(summary = "[ADMIN] Get forum status")
    @GetMapping("/status")
    public Map<String, Object> getStatus() {
        return Map.of("enabled", forumToggle.isEnabled());
    }

    @Operation(
            summary = "[ADMIN] Enable or disable the forum",
            description = "Pass `{\"enabled\": false}` to lock the forum immediately without a restart. " +
                          "Admins can still read and moderate while the forum is locked. " +
                          "State resets to the FORUM_ENABLED env var value on next restart.")
    @PostMapping("/status")
    public Map<String, Object> setStatus(@RequestBody ForumStatusRequest req) {
        forumToggle.setEnabled(req.enabled());
        String message = req.enabled() ? "Forum is now enabled." : "Forum is now disabled.";
        return Map.of("enabled", forumToggle.isEnabled(), "message", message);
    }

    public record ForumStatusRequest(boolean enabled) {}
}
