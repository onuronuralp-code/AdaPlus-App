package app.adaplus.backend.config;

import java.util.List;

public record IslandSchedule(String timezone, String origin, List<Route> routes) {

    public record Route(
            String to,
            String provider,
            List<String> via,
            List<Cal> calendar
    ) {}

    public record Cal(
            List<String> days,
            List<String> times
    ) {}
}
