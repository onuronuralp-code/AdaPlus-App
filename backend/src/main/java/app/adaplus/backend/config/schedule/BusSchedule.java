package app.adaplus.backend.config.schedule;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import java.util.List;

@JsonIgnoreProperties(ignoreUnknown = true)
public record BusSchedule(
        String routeCode,
        String routeName,
        String direction,
        String provider,
        String island,
        String timezone,
        Integer oneWayDurationMinutes,
        List<String> stops,
        List<Cal> calendar
) {
    public record Cal(
            List<String> days,
            List<String> times
    ) { }
}
