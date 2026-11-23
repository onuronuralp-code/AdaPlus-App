package app.adaplus.backend.service;

import app.adaplus.backend.config.schedule.BusSchedule;
import app.adaplus.backend.dto.schedule.BusDepartureDto;
import app.adaplus.backend.util.RouteNorm;
import org.springframework.stereotype.Service;
import java.time.*;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class IslandBusService {

    private static final DateTimeFormatter HHMM = DateTimeFormatter.ofPattern("HH:mm");
    private static final String DEFAULT_TZ = "Europe/Istanbul";


    private final Map<String, BusSchedule> busSchedulesByRoute;
    private final HolidayCalendar holidayCalendar;

    public IslandBusService(Map<String, BusSchedule> busSchedulesByRoute, HolidayCalendar holidayCalendar) {
        this.busSchedulesByRoute = busSchedulesByRoute == null ? Map.of() : busSchedulesByRoute;
        this.holidayCalendar = holidayCalendar;
    }

    public List<BusDepartureDto> nextFrom(String route, String stop, LocalDate date, int limit) {
        BusSchedule schedule = resolveSchedule(route);
        if (schedule == null) return List.of();

        ZoneId zone = zoneOf(schedule);
        ZonedDateTime now = ZonedDateTime.now(zone);

        LocalDate targetDate = (date == null) ? now.toLocalDate() : date;
        if (targetDate.isBefore(now.toLocalDate())) {
            return List.of();
        }

        DayOfWeek targetDay = holidayCalendar.effectiveDay(targetDate);
        boolean isToday = targetDate.equals(now.toLocalDate());

        String stopFilter = normalizeNullable(stop);

        List<LocalTime> times = safe(schedule.calendar()).stream()
                .filter(cal -> dayMatches(targetDay, cal.days()))
                .flatMap(cal -> safe(cal.times()).stream())
                .map(this::parseTimeLenient)
                .flatMap(Optional::stream)
                .sorted()
                .collect(Collectors.toList());

        List<String> stops = safe(schedule.stops());
        if (stops.isEmpty()) {
            return List.of();
        }

        List<BusDepartureDto> out = new ArrayList<>();

        for (LocalTime t : times) {
            ZonedDateTime dep = ZonedDateTime.of(targetDate, t, zone);
            long minutesUntil = Duration.between(now, dep).toMinutes();

            if (isToday && minutesUntil < 0) {
                continue;
            }

            if (stopFilter == null) {
                out.add(new BusDepartureDto(
                        schedule.routeCode(),
                        schedule.routeName(),
                        schedule.direction(),
                        schedule.provider(),
                        schedule.island(),
                        stops.get(0),
                        t.format(HHMM),
                        minutesUntil
                ));
            } else {
                Optional<String> matchedStop = stops.stream()
                        .filter(Objects::nonNull)
                        .filter(s -> normalize(s).equals(stopFilter))
                        .findFirst();

                if (matchedStop.isPresent()) {
                    out.add(new BusDepartureDto(
                            schedule.routeCode(),
                            schedule.routeName(),
                            schedule.direction(),
                            schedule.provider(),
                            schedule.island(),
                            matchedStop.get(),
                            t.format(HHMM),
                            minutesUntil
                    ));
                }
            }
        }

        out.sort(Comparator.comparingLong(BusDepartureDto::minutesUntil));

        if (limit > 0 && out.size() > limit) {
            return out.subList(0, limit);
        }
        return out;
    }

    private BusSchedule resolveSchedule(String route) {
        if (route == null || route.isBlank()) return null;
        return busSchedulesByRoute.get(normalize(route));
    }

    private static ZoneId zoneOf(BusSchedule schedule) {
        String tz = schedule.timezone();
        if (tz == null || tz.isBlank()) tz = DEFAULT_TZ;
        return ZoneId.of(tz);
    }

    private static String normalize(String s) {
        return RouteNorm.normalize(s);
    }

    private static String normalizeNullable(String s) {
        return RouteNorm.normalize(s);
    }

    private static <T> List<T> safe(List<T> list) {
        return list == null ? List.of() : list;
    }

    private static boolean dayMatches(DayOfWeek today, List<String> yamlDays) {
        if (yamlDays == null || yamlDays.isEmpty()) return false;

        for (String yamlDay : yamlDays) {
            if (yamlDay == null) continue;
            switch (yamlDay.trim().toUpperCase(Locale.ROOT)) {
                case "MON" -> { if (today == DayOfWeek.MONDAY) return true; }
                case "TUE" -> { if (today == DayOfWeek.TUESDAY) return true; }
                case "WED" -> { if (today == DayOfWeek.WEDNESDAY) return true; }
                case "THU" -> { if (today == DayOfWeek.THURSDAY) return true; }
                case "FRI" -> { if (today == DayOfWeek.FRIDAY) return true; }
                case "SAT" -> { if (today == DayOfWeek.SATURDAY) return true; }
                case "SUN" -> { if (today == DayOfWeek.SUNDAY) return true; }
                default -> { }
            }
        }
        return false;
    }

    private Optional<LocalTime> parseTimeLenient(String raw) {
        if (raw == null) return Optional.empty();

        String cleaned = raw.trim()
                .replace("*", "")
                .replaceAll("\\s+", "")
                .replaceAll("[^0-9:]", "");

        if (cleaned.isBlank()) return Optional.empty();

        try {
            return Optional.of(LocalTime.parse(cleaned));
        } catch (DateTimeParseException e) {
            try {
                return Optional.of(LocalTime.parse(cleaned, HHMM));
            } catch (DateTimeParseException ignored) {
                return Optional.empty();
            }
        }
    }
}