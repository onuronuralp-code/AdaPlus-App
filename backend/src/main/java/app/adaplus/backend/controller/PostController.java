package app.adaplus.backend.controller;

import app.adaplus.backend.dto.forum.CreatePostRequest;
import app.adaplus.backend.dto.forum.LikeResponse;
import app.adaplus.backend.dto.forum.PostDto;
import app.adaplus.backend.dto.forum.UpdatePostRequest;
import app.adaplus.backend.entity.PostType;
import app.adaplus.backend.service.PostService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.security.SecurityRequirements;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/forum/posts")
@RequiredArgsConstructor
@Tag(name = "Forum", description = "Agora forum — island community posts and replies.")
public class PostController {

    private final PostService postService;

    @Operation(summary = "List top-level posts", description = "Paginated feed, newest first. Optional category filter. No auth required.")
    @SecurityRequirements
    @GetMapping
    public Page<PostDto> getPosts(
            @Parameter(description = "Filter by post type: MESSAGE or POLL")
            @RequestParam(required = false) PostType postType,
            @Parameter(description = "Filter by topic ID") @RequestParam(required = false) UUID topicId,
            @Parameter(description = "Page number (0-based)") @RequestParam(defaultValue = "0") int page,
            @Parameter(description = "Page size") @RequestParam(defaultValue = "20") int size
    ) {
        return postService.getPosts(postType, topicId, page, size);
    }

    @Operation(summary = "List poll posts", description = "Paginated feed of POLL-type posts only. No auth required.")
    @SecurityRequirements
    @GetMapping("/polls")
    public Page<PostDto> getPolls(
            @Parameter(description = "Page number (0-based)") @RequestParam(defaultValue = "0") int page,
            @Parameter(description = "Page size") @RequestParam(defaultValue = "20") int size
    ) {
        return postService.getPolls(page, size);
    }

    @Operation(summary = "Get hottest posts",
               description = "Top-level posts ranked by likes + replies. No auth required.")
    @SecurityRequirements
    @GetMapping("/hot")
    public List<PostDto> getHotPosts(
            @Parameter(description = "Number of posts to return") @RequestParam(defaultValue = "10") int limit
    ) {
        return postService.getHotPosts(limit);
    }

    @Operation(summary = "Like or unlike a post", description = "Toggles like. Requires authentication.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Like toggled"),
            @ApiResponse(responseCode = "401", description = "Authentication required")
    })
    @PostMapping("/{id}/like")
    public LikeResponse toggleLike(@PathVariable UUID id) {
        return postService.toggleLike(id);
    }

    @Operation(summary = "Report a post", description = "Flags post for admin review. One report per user per post.")
    @ApiResponses({
            @ApiResponse(responseCode = "204", description = "Post reported"),
            @ApiResponse(responseCode = "409", description = "Already reported"),
            @ApiResponse(responseCode = "401", description = "Authentication required")
    })
    @PostMapping("/{id}/report")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void reportPost(@PathVariable UUID id) {
        postService.reportPost(id);
    }

    @Operation(summary = "Get replies for a post", description = "Returns replies ordered oldest first. No auth required.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Replies returned"),
            @ApiResponse(responseCode = "404", description = "Post not found")
    })
    @SecurityRequirements
    @GetMapping("/{id}/replies")
    public List<PostDto> getReplies(@PathVariable UUID id) {
        return postService.getReplies(id);
    }

    @Operation(summary = "Create a post or reply",
               description = "Requires authentication. Posts and replies are unlimited. Content is moderated by AI.")
    @ApiResponses({
            @ApiResponse(responseCode = "201", description = "Post created"),
            @ApiResponse(responseCode = "400", description = "Validation error, daily limit reached, or content flagged"),
            @ApiResponse(responseCode = "401", description = "Authentication required")
    })
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public PostDto createPost(@Valid @RequestBody CreatePostRequest req) {
        return postService.createPost(req);
    }

    @Operation(summary = "Edit a post", description = "Post owner or ADMIN only. Polls cannot be edited.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Post updated"),
            @ApiResponse(responseCode = "400", description = "Validation error, content flagged, or poll post"),
            @ApiResponse(responseCode = "401", description = "Authentication required"),
            @ApiResponse(responseCode = "403", description = "Not your post"),
            @ApiResponse(responseCode = "404", description = "Post not found")
    })
    @PutMapping("/{id}")
    public PostDto updatePost(@PathVariable UUID id, @Valid @RequestBody UpdatePostRequest req) {
        return postService.updatePost(id, req);
    }

    @Operation(summary = "Delete a post", description = "Post owner or ADMIN only. Deleting a post also deletes its replies.")
    @ApiResponses({
            @ApiResponse(responseCode = "204", description = "Post deleted"),
            @ApiResponse(responseCode = "401", description = "Authentication required"),
            @ApiResponse(responseCode = "403", description = "Not your post"),
            @ApiResponse(responseCode = "404", description = "Post not found")
    })
    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deletePost(@PathVariable UUID id) {
        postService.deletePost(id);
    }
}
