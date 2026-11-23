package app.adaplus.backend.dto.auth;

import app.adaplus.backend.dto.user.UserProfileDto;

public record LoginResponse(String token, UserProfileDto user) {}
