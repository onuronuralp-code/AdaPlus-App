package app.adaplus.backend.controller;

import app.adaplus.backend.service.GuideService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

@RestController
@RequestMapping("/api/v1/guide")
@RequiredArgsConstructor
@Tag(name = "Guide", description = "AI-powered island guide (RAG)")
public class GuideController {

    private final GuideService guideService;

    @Operation(summary = "Send a message to Ada AI guide (streaming SSE)",
               description = "Returns a text/event-stream. Each SSE event data field contains a text chunk.")
    @PostMapping("/chat/stream")
    public SseEmitter chatStream(@AuthenticationPrincipal String userId,
                                 @Valid @RequestBody ChatRequest req,
                                 jakarta.servlet.http.HttpServletResponse response) {
        // Pre-validate before committing to SSE — lets GlobalExceptionHandler return JSON 4xx
        guideService.validateChatRequest(userId);
        response.setContentType("text/event-stream");
        response.setCharacterEncoding("UTF-8");
        SseEmitter emitter = new SseEmitter(60_000L);
        guideService.chatStream(userId, req.message(), req.island(), emitter);
        return emitter;
    }

    @Operation(summary = "Send a message to Ada AI guide (non-streaming fallback)")
    @PostMapping("/chat")
    public ChatResponse chat(@Valid @RequestBody ChatRequest req) {
        String reply = guideService.chat(req.message(), req.island());
        return new ChatResponse(reply);
    }

    public record ChatRequest(
            @NotBlank(message = "Message is required")
            @Size(max = 1000, message = "Message must not exceed 1000 characters")
            String message,

            @Size(max = 50)
            String island
    ) {}

    public record ChatResponse(String reply) {}
}
