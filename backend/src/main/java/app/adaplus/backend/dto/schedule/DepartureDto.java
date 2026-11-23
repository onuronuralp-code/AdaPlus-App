package app.adaplus.backend.dto.schedule;

import com.fasterxml.jackson.annotation.JsonInclude;
import java.util.List;

@JsonInclude(JsonInclude.Include.NON_EMPTY)
public record DepartureDto(
        String from,
        String to,
        String provider,
        List<String> via,
        String time,
        long minutesUntil
) {}
