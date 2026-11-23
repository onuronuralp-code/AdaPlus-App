package app.adaplus.backend.dto.alarm;

import app.adaplus.backend.entity.FerryAlarm;

import java.time.Instant;
import java.util.UUID;

public record FerryAlarmDto(
        UUID id,
        String routeFrom,
        String routeTo,
        String departureTime,
        int minutesBefore,
        boolean active,
        Instant createdAt
) {
    public static FerryAlarmDto from(FerryAlarm a) {
        return new FerryAlarmDto(
                a.getId(),
                a.getRouteFrom(),
                a.getRouteTo(),
                a.getDepartureTime(),
                a.getMinutesBefore(),
                a.isActive(),
                a.getCreatedAt()
        );
    }
}
