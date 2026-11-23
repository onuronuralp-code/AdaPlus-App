package app.adaplus.backend.dto.alarm;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

public record CreateFerryAlarmRequest(

        @NotBlank(message = "routeFrom is required")
        String routeFrom,

        @NotBlank(message = "routeTo is required")
        String routeTo,

        @NotBlank(message = "departureTime is required")
        @Pattern(regexp = "^([01]\\d|2[0-3]):[0-5]\\d$", message = "departureTime must be HH:mm")
        String departureTime,

        int minutesBefore
) {}
