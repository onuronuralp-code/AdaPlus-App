package app.adaplus.backend.entity;

import com.fasterxml.jackson.annotation.JsonCreator;

public enum PostType {
    MESSAGE,
    POLL;

    // Older app builds still send the retired DISCUSSION / COMPLAINT / INFO types —
    // map them onto MESSAGE instead of rejecting the request.
    @JsonCreator
    public static PostType fromValue(String value) {
        if (value == null || value.isBlank()) return null;
        return switch (value.trim().toUpperCase()) {
            case "POLL" -> POLL;
            case "MESSAGE", "DISCUSSION", "COMPLAINT", "INFO" -> MESSAGE;
            default -> throw new IllegalArgumentException("Unknown post type: " + value);
        };
    }
}
