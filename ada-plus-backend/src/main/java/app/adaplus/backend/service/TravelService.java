package app.adaplus.backend.service;

import app.adaplus.backend.config.IslandSchedule;
import app.adaplus.backend.dto.DepartureDto;
import org.springframework.stereotype.Service;
import java.time.*;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class TravelService {

    private static final DateTimeFormatter HHMM = DateTimeFormatter.ofPattern("HH:mm");
    private static final String DEFAULT_TZ = "Europe/Istanbul";

    // key is normalized (lowercased) origin, per ScheduleConfig.normalize()
    private final Map<String, IslandSchedule> schedulesByOrigin;

    public TravelService(Map<String, IslandSchedule> schedulesByOrigin) {
        this.schedulesByOrigin = schedulesByOrigin == null ? Map.of() : schedulesByOrigin;
    }

    /**
     * Returns departures for the given origin.
     * - to is optional: if provided, filters destination.
     * - date is optional: if null, uses "today" in schedule timezone.
     * - For "today": returns only future departures (minutesUntil >= 0).
     * - For other days: returns all departures for that day (minutesUntil may be negative).
     * Results are sorted by minutesUntil ascending and limited if limit > 0.
     */
    public List<DepartureDto> nextFrom(String from, String to, LocalDate date, int limit) {
        IslandSchedule schedule = resolveSchedule(from);
        if (schedule == null) return List.of();

        ZoneId zone = zoneOf(schedule);
        ZonedDateTime now = ZonedDateTime.now(zone);

        LocalDate targetDate = (date == null) ? now.toLocalDate() : date;
        DayOfWeek targetDay = targetDate.getDayOfWeek();

        boolean isToday = targetDate.equals(now.toLocalDate());
        String toFilter = normalizeOpt(to);

        List<DepartureDto> departures = new ArrayList<>();

        for (IslandSchedule.Route route : safe(schedule.routes())) {
            if (route == null) continue;

            // optional destination filter (case-insensitive)
            if (toFilter != null) {
                if (route.to() == null || !normalize(route.to()).equals(toFilter)) {
                    continue;
                }
            }

            // Collect target day's times from calendar blocks whose 'days' contains targetDay
            List<LocalTime> times = safe(route.calendar()).stream()
                    .filter(cal -> dayMatches(targetDay, cal.days()))
                    .flatMap(cal -> safe(cal.times()).stream())
                    .map(this::parseTimeLenient)
                    .flatMap(Optional::stream)
                    .sorted()
                    .collect(Collectors.toList());

            for (LocalTime t : times) {
                ZonedDateTime dep = ZonedDateTime.of(targetDate, t, zone);
                long minutes = Duration.between(now, dep).toMinutes();

                // For today, only show future
                if (isToday && minutes < 0) continue;

                departures.add(new DepartureDto(
                        schedule.origin(),
                        route.to(),
                        route.provider(),
                        route.via() == null ? List.of() : route.via(),
                        t.format(HHMM),
                        minutes
                ));
            }
        }

        departures.sort(Comparator.comparingLong(DepartureDto::minutesUntil));

        if (limit > 0 && departures.size() > limit) {
            return departures.subList(0, limit);
        }
        return departures;
    }

    // -------------------------
    // Helpers
    // -------------------------

    private IslandSchedule resolveSchedule(String from) {
        if (from == null || from.isBlank()) return null;
        return schedulesByOrigin.get(normalize(from));
    }

    private static ZoneId zoneOf(IslandSchedule schedule) {
        String tz = schedule.timezone();
        if (tz == null || tz.isBlank()) tz = DEFAULT_TZ;
        return ZoneId.of(tz);
    }

    private static String normalize(String s) {
        return s.trim().toLowerCase(Locale.ROOT);
    }

    private static String normalizeOpt(String s) {
        if (s == null) return null;
        String t = s.trim();
        return t.isEmpty() ? null : t.toLowerCase(Locale.ROOT);
    }

    private static <T> List<T> safe(List<T> list) {
        return list == null ? List.of() : list;
    }

    /**
     * Accepts YAML day strings: "MON", "TUE", ... "SUN".
     */
    private static boolean dayMatches(DayOfWeek targetDay, List<String> yamlDays) {
        if (yamlDays == null || yamlDays.isEmpty()) return false;

        for (String yamlDay : yamlDays) {
            if (yamlDay == null) continue;
            switch (yamlDay.trim().toUpperCase(Locale.ROOT)) {
                case "MON" -> { if (targetDay == DayOfWeek.MONDAY) return true; }
                case "TUE" -> { if (targetDay == DayOfWeek.TUESDAY) return true; }
                case "WED" -> { if (targetDay == DayOfWeek.WEDNESDAY) return true; }
                case "THU" -> { if (targetDay == DayOfWeek.THURSDAY) return true; }
                case "FRI" -> { if (targetDay == DayOfWeek.FRIDAY) return true; }
                case "SAT" -> { if (targetDay == DayOfWeek.SATURDAY) return true; }
                case "SUN" -> { if (targetDay == DayOfWeek.SUNDAY) return true; }
                default -> { /* ignore unknown */ }
            }
        }
        return false;
    }

    /**
     * Parses times like:
     * - "06:30"
     * - "06:30*"
     * - "06:30 *"
     * - " 06:30 "
     */
    private Optional<LocalTime> parseTimeLenient(String raw) {
        if (raw == null) return Optional.empty();

        String cleaned = raw.trim();
        cleaned = cleaned.replace("*", "");
        cleaned = cleaned.replaceAll("\\s+", "");
        cleaned = cleaned.replaceAll("[^0-9:]", "");

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

    public List<DepartureDto> nextFrom(String from, String to, LocalDate date, int limit, String includeNextDayUntil) {
        IslandSchedule schedule = resolveSchedule(from);
        if (schedule == null) return List.of();

        ZoneId zone = zoneOf(schedule);
        ZonedDateTime now = ZonedDateTime.now(zone);

        LocalDate targetDate = (date == null) ? now.toLocalDate() : date;
        DayOfWeek targetDay = targetDate.getDayOfWeek();

        boolean isToday = targetDate.equals(now.toLocalDate());
        String toFilter = normalizeOpt(to);

        // parse cutoff
        LocalTime cutoff = parseTimeLenient(includeNextDayUntil).orElse(LocalTime.of(3, 0));

        List<DepartureDto> departures = new ArrayList<>();

        for (IslandSchedule.Route route : safe(schedule.routes())) {
            if (route == null) continue;

            if (toFilter != null) {
                if (route.to() == null || !normalize(route.to()).equals(toFilter)) continue;
            }

            // times for target day
            List<LocalTime> times = safe(route.calendar()).stream()
                    .filter(cal -> dayMatches(targetDay, cal.days()))
                    .flatMap(cal -> safe(cal.times()).stream())
                    .map(this::parseTimeLenient)
                    .flatMap(Optional::stream)
                    .sorted()
                    .toList();

            for (LocalTime t : times) {
                ZonedDateTime dep = ZonedDateTime.of(targetDate, t, zone);
                long minutes = Duration.between(now, dep).toMinutes();

                if (isToday && minutes < 0) continue; // only future for today

                departures.add(new DepartureDto(
                        schedule.origin(), route.to(), route.provider(),
                        route.via() == null ? List.of() : route.via(),
                        t.format(HHMM), minutes
                ));
            }

            // include next-day early hours ONLY when querying "today"
            if (isToday) {
                LocalDate tomorrow = targetDate.plusDays(1);
                DayOfWeek tomorrowDay = tomorrow.getDayOfWeek();

                List<LocalTime> nextDayEarly = safe(route.calendar()).stream()
                        .filter(cal -> dayMatches(tomorrowDay, cal.days()))
                        .flatMap(cal -> safe(cal.times()).stream())
                        .map(this::parseTimeLenient)
                        .flatMap(Optional::stream)
                        .filter(t -> t.isBefore(cutoff)) // < 03:00
                        .sorted()
                        .toList();

                for (LocalTime t : nextDayEarly) {
                    ZonedDateTime dep = ZonedDateTime.of(tomorrow, t, zone);
                    long minutes = Duration.between(now, dep).toMinutes();
                    if (minutes < 0) continue;

                    departures.add(new DepartureDto(
                            schedule.origin(), route.to(), route.provider(),
                            route.via() == null ? List.of() : route.via(),
                            t.format(HHMM), minutes
                    ));
                }
            }
        }

        departures.sort(Comparator.comparingLong(DepartureDto::minutesUntil));

        if (limit > 0 && departures.size() > limit) {
            return departures.subList(0, limit);
        }
        return departures;
    }

}