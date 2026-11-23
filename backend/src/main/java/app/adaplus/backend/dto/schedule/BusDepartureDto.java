package app.adaplus.backend.dto.schedule;

public record BusDepartureDto(
        String routeCode,
        String routeName,
        String direction,
        String provider,
        String island,
        String stop,
        String time,
        long minutesUntil
) { }
