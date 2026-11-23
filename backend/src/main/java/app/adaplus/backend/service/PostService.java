package app.adaplus.backend.service;

import app.adaplus.backend.config.ForumToggle;
import app.adaplus.backend.dto.forum.CreatePostRequest;
import app.adaplus.backend.dto.forum.LikeResponse;
import app.adaplus.backend.dto.forum.PollOptionDto;
import app.adaplus.backend.dto.forum.PostDto;
import app.adaplus.backend.dto.forum.UpdatePostRequest;
import app.adaplus.backend.entity.PollOption;
import app.adaplus.backend.entity.PollVote;
import app.adaplus.backend.entity.Post;
import app.adaplus.backend.entity.PostLike;
import app.adaplus.backend.entity.PostReport;
import app.adaplus.backend.entity.PostType;
import app.adaplus.backend.entity.Role;
import app.adaplus.backend.entity.Topic;
import app.adaplus.backend.entity.User;
import app.adaplus.backend.entity.NotificationType;
import app.adaplus.backend.exception.ConflictException;
import app.adaplus.backend.exception.ResourceNotFoundException;
import app.adaplus.backend.exception.UnauthorizedException;
import app.adaplus.backend.repository.PollOptionRepository;
import app.adaplus.backend.repository.PollVoteRepository;
import app.adaplus.backend.repository.PostLikeRepository;
import app.adaplus.backend.repository.PostReportRepository;
import app.adaplus.backend.repository.PostRepository;
import app.adaplus.backend.repository.TopicRepository;
import app.adaplus.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.data.domain.PageRequest;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.ZoneId;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Transactional
public class PostService {

    private static final ZoneId ISTANBUL = ZoneId.of("Europe/Istanbul");

    private final PostRepository postRepository;
    private final PostLikeRepository postLikeRepository;
    private final PostReportRepository postReportRepository;
    private final PollOptionRepository pollOptionRepository;
    private final PollVoteRepository pollVoteRepository;
    private final TopicRepository topicRepository;
    private final UserRepository userRepository;
    private final ModerationService moderationService;
    private final NotificationService notificationService;
    private final PushNotificationService pushNotificationService;
    private final ForumToggle forumToggle;

    @Transactional(readOnly = true)
    public Page<PostDto> getPosts(PostType postType, UUID topicId, int page, int size) {
        PageRequest pageable = PageRequest.of(page, size);
        Page<Post> posts;
        if (postType != null) {
            posts = postRepository.findRankedFeedByPostType(postType.name(), pageable);
        } else if (topicId != null) {
            Topic topic = topicRepository.findById(topicId)
                    .orElseThrow(() -> new ResourceNotFoundException("Topic not found"));
            posts = postRepository.findByParentPostIsNullAndTopicOrderByCreatedAtDesc(topic, pageable);
        } else {
            posts = postRepository.findByParentPostIsNullOrderByCreatedAtDesc(pageable);
        }
        return posts.map(this::toDto);
    }

    @Transactional(readOnly = true)
    public Page<PostDto> getPolls(int page, int size) {
        return postRepository.findRankedFeedByPostType(PostType.POLL.name(), PageRequest.of(page, size))
                .map(this::toDto);
    }

    @Transactional(readOnly = true)
    public Page<PostDto> getUserPosts(UUID userId, int page, int size) {
        User user = findUserOrThrow(userId);
        return postRepository.findByUserAndParentPostIsNullOrderByCreatedAtDesc(
                user, PageRequest.of(page, size)).map(this::toDto);
    }

    @Transactional(readOnly = true)
    public Page<PostDto> getUserReplies(UUID userId, int page, int size) {
        User user = findUserOrThrow(userId);
        return postRepository.findByUserAndParentPostIsNotNullOrderByCreatedAtDesc(
                user, PageRequest.of(page, size)).map(this::toDto);
    }

    @Transactional(readOnly = true)
    public Page<PostDto> getUserLikes(UUID userId, int page, int size) {
        User user = findUserOrThrow(userId);
        return postLikeRepository.findByUserOrderByCreatedAtDesc(user, PageRequest.of(page, size))
                .map(like -> toDto(like.getPost()));
    }

    @Transactional(readOnly = true)
    public List<PostDto> getHotPosts(int limit) {
        return postRepository.findHotPosts(PageRequest.of(0, limit))
                .stream()
                .map(this::toDto)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<PostDto> getReplies(UUID postId) {
        Post parent = findPostOrThrow(postId);
        return postRepository.findByParentPostOrderByCreatedAtAsc(parent)
                .stream()
                .map(r -> PostDto.from(r, 0, postLikeRepository.countByPost(r), null, 
                        getOptionalCurrentUser() != null && postLikeRepository.existsByUserAndPost(getOptionalCurrentUser(), r)))
                .toList();
    }

    public PostDto createPost(CreatePostRequest req) {
        User user = getCurrentUser();
        boolean isAdmin = user.getRole() == Role.ADMIN;
        forumToggle.requireEnabled(isAdmin);

        if (!isAdmin) {
            if (!user.isPhoneVerified()) {
                throw new ResponseStatusException(HttpStatus.FORBIDDEN, "phone_verification_required");
            }
        }

        PostType postType = req.postType() != null ? req.postType() : PostType.MESSAGE;
        String imageUrl = blankToNull(req.imageUrl());
        String content = req.content() != null ? req.content().trim() : "";

        // A photo can stand on its own; otherwise the post needs text. Polls always need a question.
        if (postType == PostType.POLL || imageUrl == null) {
            if (content.length() < 3) {
                throw new IllegalArgumentException("Post content must be between 3 and 500 characters");
            }
        }

        if (!content.isEmpty() && moderationService.isFlagged(content)) {
            throw new IllegalArgumentException("content_policy_violation");
        }

        if (postType == PostType.POLL) {
            if (req.pollDurationHours() == null || req.pollDurationHours() < 1 || req.pollDurationHours() > 168) {
                throw new IllegalArgumentException("Poll duration must be between 1 and 168 hours (7 days)");
            }
        }

        Post.PostBuilder builder = Post.builder()
                .user(user)
                .content(content)
                .postType(postType)
                .imageUrl(postType == PostType.POLL ? null : imageUrl)
                .anonymous(req.anonymous())
                .pollEndsAt(postType == PostType.POLL
                        ? Instant.now().plusSeconds(req.pollDurationHours() * 3600L)
                        : null);

        if (req.topicId() != null) {
            Topic topic = topicRepository.findById(req.topicId())
                    .orElseThrow(() -> new ResourceNotFoundException("Topic not found"));
            builder.topic(topic);
        }

        Post parentPost = null;
        if (req.parentId() != null) {
            parentPost = findPostOrThrow(req.parentId());
            if (parentPost.getParentPost() != null) {
                throw new IllegalArgumentException("Replies to replies are not allowed.");
            }
            builder.parentPost(parentPost);
        }

        Post saved = postRepository.save(builder.build());

        if (parentPost != null && !parentPost.getUser().getId().equals(user.getId())) {
            String authorName = req.anonymous() ? "Biri" : user.getFullName();
            String notifTitle = "Yeni Yorum";
            String notifBody = authorName + " gönderinize yorum yaptı.";
            notificationService.push(
                    parentPost.getUser().getId(),
                    NotificationType.REPLY,
                    notifTitle,
                    notifBody,
                    saved.getId()
            );
            pushNotificationService.sendToUser(parentPost.getUser().getId(), notifTitle, notifBody);
        }

        List<PollOptionDto> pollOptions = null;
        if (postType == PostType.POLL) {
            List<String> options = req.pollOptions();
            if (options == null || options.size() < 2) {
                throw new IllegalArgumentException("Polls require at least 2 options");
            }
            if (options.size() > 6) {
                throw new IllegalArgumentException("Polls can have at most 6 options");
            }
            for (int i = 0; i < options.size(); i++) {
                pollOptionRepository.save(PollOption.builder()
                        .post(saved)
                        .text(options.get(i).trim())
                        .sortOrder(i)
                        .build());
            }
            pollOptions = pollOptionRepository.findByPostOrderBySortOrderAsc(saved)
                    .stream()
                    .map(o -> new PollOptionDto(o.getId(), o.getText(), 0, 0.0, false))
                    .toList();
        }

        return PostDto.from(saved, 0, 0, pollOptions, false);
    }

    public LikeResponse toggleLike(UUID postId) {
        User user = getCurrentUser();
        forumToggle.requireEnabled(user.getRole() == Role.ADMIN);
        Post post = findPostOrThrow(postId);

        boolean liked;
        try {
            postLikeRepository.findByUserAndPost(user, post).ifPresentOrElse(
                    postLikeRepository::delete,
                    () -> postLikeRepository.saveAndFlush(PostLike.builder().user(user).post(post).build())
            );
            liked = postLikeRepository.findByUserAndPost(user, post).isPresent();
        } catch (DataIntegrityViolationException e) {
            // concurrent double-tap: the like already exists, treat as liked
            liked = true;
        }

        long likeCount = postLikeRepository.countByPost(post);

        if (liked && !post.getUser().getId().equals(user.getId())) {
            notificationService.push(
                    post.getUser().getId(),
                    NotificationType.LIKE,
                    "Gönderin Beğenildi",
                    user.getFullName() + " gönderini beğendi.",
                    post.getId()
            );
        }

        return new LikeResponse(liked, likeCount);
    }

    public void reportPost(UUID postId) {
        User user = getCurrentUser();
        forumToggle.requireEnabled(user.getRole() == Role.ADMIN);
        Post post = findPostOrThrow(postId);
        if (postReportRepository.existsByUserAndPost(user, post)) {
            throw new ConflictException("You have already reported this post");
        }
        postReportRepository.save(PostReport.builder().user(user).post(post).build());
    }

    public PostDto updatePost(UUID postId, UpdatePostRequest req) {
        User user = getCurrentUser();
        boolean isAdmin = user.getRole() == Role.ADMIN;
        forumToggle.requireEnabled(isAdmin);
        Post post = findPostOrThrow(postId);
        if (!post.getUser().getId().equals(user.getId()) && !isAdmin) {
            throw new UnauthorizedException("You can only edit your own posts");
        }
        // Re-check current standing on every edit — a post created while eligible
        // shouldn't become an indefinite loophole for republishing new content after
        // the author no longer qualifies (e.g. was never phone-verified under this rule).
        if (!isAdmin) {
            if (!user.isPhoneVerified()) {
                throw new ResponseStatusException(HttpStatus.FORBIDDEN, "phone_verification_required");
            }
        }
        if (post.getPostType() == PostType.POLL) {
            throw new IllegalArgumentException("Poll posts cannot be edited");
        }
        String imageUrl = blankToNull(req.imageUrl());
        String content = req.content() != null ? req.content().trim() : "";
        if (imageUrl == null && content.length() < 3) {
            throw new IllegalArgumentException("Post content must be between 3 and 1000 characters");
        }
        if (!content.isEmpty() && moderationService.isFlagged(content)) {
            throw new IllegalArgumentException("Your post was flagged for inappropriate content and could not be updated.");
        }
        post.setContent(content);
        post.setImageUrl(imageUrl);
        return toDto(postRepository.save(post));
    }

    private static String blankToNull(String s) {
        return s == null || s.isBlank() ? null : s.trim();
    }

    public void deletePost(UUID postId) {
        User user = getCurrentUser();
        Post post = findPostOrThrow(postId);
        if (!post.getUser().getId().equals(user.getId()) && user.getRole() != Role.ADMIN) {
            throw new UnauthorizedException("You can only delete your own posts");
        }
        deletePostRecursively(post);
    }

    private void deletePostRecursively(Post post) {
        List<Post> replies = postRepository.findByParentPostOrderByCreatedAtAsc(post);
        for (Post reply : replies) {
            deletePostRecursively(reply);
        }
        
        postLikeRepository.deleteByPost(post);
        postReportRepository.deleteByPost(post);
        pollVoteRepository.deleteByPost(post);
        pollOptionRepository.deleteByPost(post);
        
        postRepository.delete(post);
    }

    public PostDto vote(UUID postId, UUID optionId) {
        User user = getCurrentUser();
        forumToggle.requireEnabled(user.getRole() == Role.ADMIN);
        Post post = findPostOrThrow(postId);
        if (post.getPostType() != PostType.POLL) {
            throw new IllegalArgumentException("This post is not a poll");
        }
        if (post.getPollEndsAt() != null && Instant.now().isAfter(post.getPollEndsAt())) {
            throw new IllegalStateException("This poll has ended");
        }
        PollOption option = pollOptionRepository.findById(optionId)
                .orElseThrow(() -> new ResourceNotFoundException("Poll option not found"));
        if (!option.getPost().getId().equals(postId)) {
            throw new IllegalArgumentException("Option does not belong to this poll");
        }

        pollVoteRepository.deleteByUserAndPost(user, post);

        pollVoteRepository.save(PollVote.builder().user(user).pollOption(option).post(post).build());
        return toDto(post);
    }

    private PostDto toDto(Post post) {
        long replyCount = postRepository.countByParentPost(post);
        long likeCount = postLikeRepository.countByPost(post);
        
        boolean isLiked = false;
        User currentUser = getOptionalCurrentUser();
        if (currentUser != null) {
            isLiked = postLikeRepository.existsByUserAndPost(currentUser, post);
        }

        List<PollOptionDto> pollOptions = null;
        if (post.getPostType() == PostType.POLL) {
            List<PollOption> options = pollOptionRepository.findByPostOrderBySortOrderAsc(post);
            long totalVotes = options.stream()
                    .mapToLong(pollVoteRepository::countByPollOption)
                    .sum();
            app.adaplus.backend.entity.PollVote userVote = currentUser != null ? pollVoteRepository.findByUserAndPost(currentUser, post).orElse(null) : null;
            pollOptions = options.stream()
                    .map(o -> {
                        long votes = pollVoteRepository.countByPollOption(o);
                        double pct = totalVotes > 0
                                ? Math.round((double) votes / totalVotes * 1000.0) / 10.0
                                : 0.0;
                        boolean isVoted = userVote != null && userVote.getPollOption().getId().equals(o.getId());
                        return new PollOptionDto(o.getId(), o.getText(), votes, pct, isVoted);
                    })
                    .toList();
        }
        return PostDto.from(post, replyCount, likeCount, pollOptions, isLiked);
    }

    private User getOptionalCurrentUser() {
        var auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated() || auth.getPrincipal().equals("anonymousUser")) {
            return null;
        }
        try {
            String userId = (String) auth.getPrincipal();
            return userRepository.findById(UUID.fromString(userId)).orElse(null);
        } catch (Exception e) {
            return null;
        }
    }

    private Post findPostOrThrow(UUID id) {
        return postRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Post not found"));
    }

    private User findUserOrThrow(UUID id) {
        return userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
    }

    private User getCurrentUser() {
        String userId = (String) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        return userRepository.findById(UUID.fromString(userId))
                .orElseThrow(() -> new UnauthorizedException("User not found"));
    }
}
