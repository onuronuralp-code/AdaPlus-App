package app.adaplus.backend.service;

import app.adaplus.backend.config.schedule.IslandSchedule;
import app.adaplus.backend.dto.schedule.DepartureDto;
import app.adaplus.backend.util.RouteNorm;
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
    private final HolidayCalendar holidayCalendar;

    public TravelService(Map<String, IslandSchedule> schedulesByOrigin, HolidayCalendar holidayCalendar) {
        this.schedulesByOrigin = schedulesByOrigin == null ? Map.of() : schedulesByOrigin;
        this.holidayCalendar = holidayCalendar;
    }

    /**
     * Upcoming departures from an origin.
     *
     * @param from                origin (required)
     * @param to                  optional stop filter (can be final destination OR an intermediate stop)
     * @param date                optional date filter. If null -> today (in schedule timezone)
     * @param limit               if > 0, truncate results
     * @param includeNextDayUntil e.g. "03:00" (include next-day departures until this time)
     */
    public List<DepartureDto> nextFrom(String from,
                                       String to,
                                       LocalDate date,
                                       int limit,
                                       String includeNextDayUntil) {

        IslandSchedule schedule = resolveSchedule(from);
        if (schedule == null) return List.of();

        ZoneId zone = zoneOf(schedule);
        ZonedDateTime now = ZonedDateTime.now(zone);

        LocalDate baseDate = (date == null) ? now.toLocalDate() : date;
        if (baseDate.isBefore(now.toLocalDate())) {
            // past date -> no "next" departures
            return List.of();
        }

        LocalTime cutoff = parseCutoff(includeNextDayUntil).orElse(LocalTime.of(3, 0));

        String toNorm = normalizeNullable(to);

        List<Candidate> candidates = new ArrayList<>();

        for (IslandSchedule.Route route : safe(schedule.routes())) {
            List<String> via = safe(route.via());
            List<String> tos = safe(route.to());

            // Full ordered path of stops after origin
            List<String> path = new ArrayList<>(via.size() + tos.size());
            path.addAll(via);
            path.addAll(tos);

            // If there is no stop info, skip
            if (path.isEmpty()) continue;

            // Decide which stop(s) we want to emit:
            // - if to filter is provided: only that stop, if it exists in path
            // - else: emit each destination in route.to (NOT via stops)
            List<String> targets;
            if (toNorm != null) {
                Optional<String> matchedStop = findStopByNormalized(path, toNorm);
                if (matchedStop.isEmpty()) continue;
                targets = List.of(matchedStop.get());
            } else {
                targets = tos; // only final destinations
                if (targets.isEmpty()) continue;
            }

            // Collect times for baseDate + optionally nextDay-until-cutoff
            List<ServiceTime> serviceTimes = collectServiceTimes(route, baseDate, cutoff, zone);

            for (ServiceTime st : serviceTimes) {
                // For today: keep only future times (>= now)
                if (baseDate.equals(now.toLocalDate()) && st.departure.isBefore(now)) {
                    continue;
                }

                long minutesUntil = Duration.between(now, st.departure).toMinutes();
                if (minutesUntil < 0) continue;

                for (String target : targets) {
                    int idx = indexOfStop(path, target);
                    if (idx < 0) continue;

                    List<String> computedVia = new ArrayList<>();
                    // everything before the target in path becomes via (includes route.via + earlier island stops)
                    for (int i = 0; i < idx; i++) {
                        computedVia.add(path.get(i));
                    }

                    candidates.add(new Candidate(
                            st.departure,
                            new DepartureDto(
                                    schedule.origin(),
                                    target,
                                    route.provider(),
                                    computedVia,
                                    st.departure.toLocalTime().format(HHMM),
                                    minutesUntil
                            )
                    ));
                }
            }
        }

        // Sort by actual departure datetime (more correct than minutesUntil if date != today)
        candidates.sort(Comparator.comparing(c -> c.departure));

        List<DepartureDto> out = candidates.stream().map(c -> c.dto).collect(Collectors.toList());

        if (limit > 0 && out.size() > limit) {
            return out.subList(0, limit);
        }
        return out;
    }

    // -------------------------
    // Time collection
    // -------------------------

    private List<ServiceTime> collectServiceTimes(IslandSchedule.Route route,
                                                  LocalDate baseDate,
                                                  LocalTime cutoff,
                                                  ZoneId zone) {

        List<ServiceTime> result = new ArrayList<>();

        // base date
        DayOfWeek baseDow = holidayCalendar.effectiveDay(baseDate);
        for (IslandSchedule.Cal cal : safe(route.calendar())) {
            if (!dayMatches(baseDow, cal.days())) continue;

            for (String raw : safe(cal.times())) {
                Optional<LocalTime> t = parseTimeLenient(raw);
                if (t.isEmpty()) continue;

                ZonedDateTime dep = ZonedDateTime.of(baseDate, t.get(), zone);
                result.add(new ServiceTime(dep));
            }
        }

        // next day until cutoff (e.g. 00:00..03:00)
        if (cutoff != null) {
            LocalDate nextDate = baseDate.plusDays(1);
            DayOfWeek nextDow = holidayCalendar.effectiveDay(nextDate);

            for (IslandSchedule.Cal cal : safe(route.calendar())) {
                if (!dayMatches(nextDow, cal.days())) continue;

                for (String raw : safe(cal.times())) {
                    Optional<LocalTime> t = parseTimeLenient(raw);
                    if (t.isEmpty()) continue;

                    LocalTime lt = t.get();
                    // include only times < cutoff (strict) OR <= cutoff (your call; I chose <=)
                    if (lt.isAfter(cutoff)) continue;

                    ZonedDateTime dep = ZonedDateTime.of(nextDate, lt, zone);
                    result.add(new ServiceTime(dep));
                }
            }
        }

        // de-dup (same datetime can appear twice if YAML duplicated)
        return result.stream()
                .collect(Collectors.toMap(st -> st.departure.toInstant(), st -> st, (a, b) -> a, LinkedHashMap::new))
                .values()
                .stream()
                .toList();
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
        return RouteNorm.normalize(s);
    }

    private static String normalizeNullable(String s) {
        return RouteNorm.normalize(s);
    }

    private static <T> List<T> safe(List<T> list) {
        return list == null ? List.of() : list;
    }

    private static Optional<LocalTime> parseCutoff(String raw) {
        if (raw == null) return Optional.empty();
        String cleaned = raw.trim().replaceAll("\\s+", "");
        try {
            return Optional.of(LocalTime.parse(cleaned, HHMM));
        } catch (DateTimeParseException e) {
            return Optional.empty();
        }
    }

    /**
     * Accepts YAML day strings: "MON", "TUE", ... "SUN".
     */
    private static boolean dayMatches(DayOfWeek today, List<String> yamlDays) {
        if (yamlDays == null || yamlDays.isEmpty()) return false;

        for (String yamlDay : yamlDays) {
            if (yamlDay == null) continue;
            switch (yamlDay.trim().toUpperCase(Locale.ROOT)) {
                case "MON" -> {
                    if (today == DayOfWeek.MONDAY) return true;
                }
                case "TUE" -> {
                    if (today == DayOfWeek.TUESDAY) return true;
                }
                case "WED" -> {
                    if (today == DayOfWeek.WEDNESDAY) return true;
                }
                case "THU" -> {
                    if (today == DayOfWeek.THURSDAY) return true;
                }
                case "FRI" -> {
                    if (today == DayOfWeek.FRIDAY) return true;
                }
                case "SAT" -> {
                    if (today == DayOfWeek.SATURDAY) return true;
                }
                case "SUN" -> {
                    if (today == DayOfWeek.SUNDAY) return true;
                }
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
    private static Optional<LocalTime> parseTimeLenient(String raw) {
        if (raw == null) return Optional.empty();

        String cleaned = raw.trim();

        // remove footnotes like "*" and whitespace
        cleaned = cleaned.replace("*", "");
        cleaned = cleaned.replaceAll("\\s+", "");

        // keep only digits and colon (defensive against typos)
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

    private static Optional<String> findStopByNormalized(List<String> path, String toNorm) {
        for (String s : path) {
            if (s == null) continue;
            if (normalize(s).equals(toNorm)) return Optional.of(s);
        }
        return Optional.empty();
    }

    private static int indexOfStop(List<String> path, String stopExact) {
        for (int i = 0; i < path.size(); i++) {
            if (Objects.equals(path.get(i), stopExact)) return i;
        }
        return -1;
    }

    private record ServiceTime(ZonedDateTime departure) {
    }

    private record Candidate(ZonedDateTime departure, DepartureDto dto) {
    }
}