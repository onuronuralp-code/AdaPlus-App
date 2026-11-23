package app.adaplus.backend.service;

import app.adaplus.backend.dto.forum.CreateTopicRequest;
import app.adaplus.backend.dto.forum.TopicDto;
import app.adaplus.backend.entity.Topic;
import app.adaplus.backend.entity.User;
import app.adaplus.backend.exception.ConflictException;
import app.adaplus.backend.exception.ResourceNotFoundException;
import app.adaplus.backend.repository.TopicRepository;
import app.adaplus.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Transactional
public class TopicService {

    private final TopicRepository topicRepository;
    private final UserRepository userRepository;

    @Transactional(readOnly = true)
    public List<TopicDto> getAllTopics() {
        return topicRepository.findAll().stream().map(TopicDto::from).toList();
    }

    public TopicDto createTopic(CreateTopicRequest req) {
        String name = req.name().trim();
        if (topicRepository.existsByNameIgnoreCase(name)) {
            throw new ConflictException("A topic with this name already exists");
        }
        User user = getCurrentUser();
        Topic topic = Topic.builder().name(name).createdBy(user).build();
        return TopicDto.from(topicRepository.save(topic));
    }

    public void deleteTopic(UUID id) {
        if (!topicRepository.existsById(id)) {
            throw new ResourceNotFoundException("Topic not found");
        }
        topicRepository.deleteById(id);
    }

    private User getCurrentUser() {
        String userId = (String) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        return userRepository.findById(UUID.fromString(userId))
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
    }
}
