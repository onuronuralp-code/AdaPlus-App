package app.adaplus.backend.controller;

import app.adaplus.backend.dto.forum.CreateTopicRequest;
import app.adaplus.backend.dto.forum.TopicDto;
import app.adaplus.backend.service.TopicService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.security.SecurityRequirements;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/forum/topics")
@RequiredArgsConstructor
@Tag(name = "Forum", description = "Agora forum — island community posts and replies.")
public class TopicController {

    private final TopicService topicService;

    @Operation(summary = "List all topics", description = "No auth required.")
    @SecurityRequirements
    @GetMapping
    public List<TopicDto> getAllTopics() {
        return topicService.getAllTopics();
    }

    @Operation(summary = "Create a topic", description = "Any authenticated user can create a topic.")
    @ApiResponses({
            @ApiResponse(responseCode = "201", description = "Topic created"),
            @ApiResponse(responseCode = "409", description = "Topic name already exists")
    })
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public TopicDto createTopic(@Valid @RequestBody CreateTopicRequest req) {
        return topicService.createTopic(req);
    }

    @Operation(summary = "[ADMIN] Delete a topic", description = "Posts in the topic become uncategorized.")
    @ApiResponses({
            @ApiResponse(responseCode = "204", description = "Topic deleted"),
            @ApiResponse(responseCode = "404", description = "Topic not found")
    })
    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteTopic(@PathVariable UUID id) {
        topicService.deleteTopic(id);
    }
}
