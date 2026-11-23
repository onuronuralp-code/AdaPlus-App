package app.adaplus.backend.config.schedule;

import com.fasterxml.jackson.annotation.JsonFormat;

import java.util.List;

public record IslandSchedule(String timezone, String origin, List<Route> routes) {

    public record Route(
            @JsonFormat(with = JsonFormat.Feature.ACCEPT_SINGLE_VALUE_AS_ARRAY)
            List<String> to,
            String provider,
            List<String> via,
            List<Cal> calendar
    ) {}

    public record Cal(
            List<String> days,
            List<String> times
    ) {}
}
