package app.adaplus.backend.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import java.util.List;

@JsonInclude(JsonInclude.Include.NON_EMPTY)
public record DepartureDto(
        String from,
        String to,
        String provider,
        List<String> via,   // omitted if empty
        String time,        // "HH:mm"
        long minutesUntil
) {}
