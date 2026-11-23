package app.adaplus.backend.controller;

import app.adaplus.backend.dto.forum.PostDto;
import app.adaplus.backend.dto.forum.VoteRequest;
import app.adaplus.backend.service.PostService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1/forum/polls")
@RequiredArgsConstructor
@Tag(name = "Forum", description = "Agora forum — island community posts and replies.")
public class PollController {

    private final PostService postService;
    private final app.adaplus.backend.repository.PollVoteRepository pollVoteRepository;

    @Operation(
            summary = "Vote on a poll",
            description = "Submit a vote for one option. One vote per user per poll. " +
                          "Returns the updated post with refreshed vote counts.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Vote recorded, updated poll returned"),
            @ApiResponse(responseCode = "400", description = "Not a poll, or option doesn't belong to this poll"),
            @ApiResponse(responseCode = "401", description = "Authentication required"),
            @ApiResponse(responseCode = "404", description = "Post or option not found"),
            @ApiResponse(responseCode = "409", description = "Already voted")
    })
    @PostMapping("/{id}/vote")
    public PostDto vote(@PathVariable UUID id, @Valid @RequestBody VoteRequest req) {
        return postService.vote(id, req.optionId());
    }
}
