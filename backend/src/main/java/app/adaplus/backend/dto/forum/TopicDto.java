package app.adaplus.backend.dto.forum;

import app.adaplus.backend.entity.Topic;

import java.time.Instant;
import java.util.UUID;

public record TopicDto(UUID id, String name, String createdBy, Instant createdAt) {

    public static TopicDto from(Topic t) {
        String author = t.getCreatedBy() != null ? t.getCreatedBy().getFullName() : null;
        return new TopicDto(t.getId(), t.getName(), author, t.getCreatedAt());
    }
}
