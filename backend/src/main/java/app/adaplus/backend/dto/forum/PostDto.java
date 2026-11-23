package app.adaplus.backend.dto.forum;

import app.adaplus.backend.entity.Post;
import app.adaplus.backend.entity.PostType;
import app.adaplus.backend.entity.UserType;
import com.fasterxml.jackson.annotation.JsonProperty;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record PostDto(
        UUID id,
        UUID authorId,           // the id of the user who created it
        String authorName,       // null when anonymous
        UserType authorUserType, // null when anonymous
        String content,          // post text, or poll question for POLL type
        PostType postType,
        String imageUrl,
        UUID parentId,
        long replyCount,
        long likeCount,
        List<PollOptionDto> pollOptions, // null for non-POLL posts
        Instant pollEndsAt,             // null for non-POLL posts
        Instant createdAt,
        @JsonProperty("isLiked") boolean isLiked
) {
    public static PostDto from(Post post, long replyCount, long likeCount, List<PollOptionDto> pollOptions, boolean isLiked) {
        boolean anon = post.isAnonymous();
        String author = anon ? null : post.getUser().getFullName();
        UserType authorUserType = anon ? null : (post.getUser().getRole() == app.adaplus.backend.entity.Role.ADMIN ? UserType.ADMIN : post.getUser().getUserType());
        UUID parentId = post.getParentPost() != null ? post.getParentPost().getId() : null;
        UUID authorId = post.getUser() != null ? post.getUser().getId() : null;
        return new PostDto(
                post.getId(),
                authorId,
                author,
                authorUserType,
                post.getContent(),
                post.getPostType(),
                post.getImageUrl(),
                parentId,
                replyCount,
                likeCount,
                pollOptions,
                post.getPollEndsAt(),
                post.getCreatedAt(),
                isLiked
        );
    }
}
