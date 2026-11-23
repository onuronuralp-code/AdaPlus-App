package app.adaplus.backend.service;

import app.adaplus.backend.dto.alarm.CreateFerryAlarmRequest;
import app.adaplus.backend.dto.alarm.FerryAlarmDto;
import app.adaplus.backend.dto.schedule.DepartureDto;
import app.adaplus.backend.entity.FerryAlarm;
import app.adaplus.backend.entity.NotificationType;
import app.adaplus.backend.entity.User;
import app.adaplus.backend.exception.ConflictException;
import app.adaplus.backend.exception.ResourceNotFoundException;
import app.adaplus.backend.exception.UnauthorizedException;
import app.adaplus.backend.repository.FerryAlarmRepository;
import app.adaplus.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Set;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class FerryAlarmService {

    private static final ZoneId ISTANBUL = ZoneId.of("Europe/Istanbul");
    private static final DateTimeFormatter HHMM = DateTimeFormatter.ofPattern("HH:mm");
    private static final Set<Integer> ALLOWED_MINUTES = Set.of(15, 30, 60);

    private final FerryAlarmRepository alarmRepository;
    private final UserRepository userRepository;
    private final TravelService travelService;
    private final PushNotificationService pushNotificationService;
    private final NotificationService notificationService;

    public FerryAlarmDto createAlarm(CreateFerryAlarmRequest req) {
        if (!ALLOWED_MINUTES.contains(req.minutesBefore())) {
            throw new IllegalArgumentException("minutesBefore must be 15, 30, or 60");
        }
        User user = currentUser();
        alarmRepository.findDuplicate(
                user.getId(), req.routeFrom(), req.routeTo(), req.departureTime(), req.minutesBefore()
        ).ifPresent(a -> { throw new ConflictException("Alarm already set for this departure"); });

        FerryAlarm alarm = FerryAlarm.builder()
                .user(user)
                .routeFrom(req.routeFrom())
                .routeTo(req.routeTo())
                .departureTime(req.departureTime())
                .minutesBefore(req.minutesBefore())
                .build();
        return FerryAlarmDto.from(alarmRepository.save(alarm));
    }

    @Transactional(readOnly = true)
    public List<FerryAlarmDto> getUserAlarms() {
        UUID userId = currentUserId();
        return alarmRepository.findByUserIdOrderByCreatedAtDesc(userId)
                .stream()
                .map(FerryAlarmDto::from)
                .toList();
    }

    public void deleteAlarm(UUID id) {
        UUID userId = currentUserId();
        FerryAlarm alarm = alarmRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Alarm not found"));
        if (!alarm.getUser().getId().equals(userId)) {
            throw new UnauthorizedException("Not your alarm");
        }
        alarmRepository.delete(alarm);
    }

    /**
     * Runs every 60 seconds. Fires push notifications for alarms whose notify time
     * matches the current minute in Istanbul time, skipping days when the ferry
     * doesn't actually run that route.
     */
    @Scheduled(fixedRate = 60_000, initialDelay = 10_000)
    @Transactional
    public void processAlarms() {
        ZonedDateTime now = ZonedDateTime.now(ISTANBUL);
        LocalTime nowTime = now.toLocalTime();
        LocalDate today = now.toLocalDate();

        List<FerryAlarm> alarms = alarmRepository.findByActiveTrue();
        for (FerryAlarm alarm : alarms) {
            try {
                fireIfDue(alarm, nowTime, today);
            } catch (Exception e) {
                log.error("Error processing alarm {}: {}", alarm.getId(), e.getMessage());
            }
        }
    }

    private void fireIfDue(FerryAlarm alarm, LocalTime nowTime, LocalDate today) {
        LocalTime depTime;
        try {
            depTime = LocalTime.parse(alarm.getDepartureTime(), HHMM);
        } catch (DateTimeParseException e) {
            log.warn("Alarm {} has invalid departureTime '{}'", alarm.getId(), alarm.getDepartureTime());
            return;
        }

        LocalTime notifyTime = depTime.minusMinutes(alarm.getMinutesBefore());

        if (nowTime.getHour() != notifyTime.getHour() || nowTime.getMinute() != notifyTime.getMinute()) {
            return;
        }

        if (today.equals(alarm.getLastFiredDate())) {
            return;
        }

        // Check the departure actually runs today — skip if no matching time in schedule
        if (!departureRunsToday(alarm, today)) {
            return;
        }

        String title = "Vapur Hatırlatması";
        String body = alarm.getRouteFrom() + " → " + alarm.getRouteTo()
                + " seferi " + alarm.getMinutesBefore() + " dakika sonra kalkıyor! (" + alarm.getDepartureTime() + ")";

        UUID userId = alarm.getUser().getId();
        pushNotificationService.sendToUser(userId, title, body);
        notificationService.push(userId, NotificationType.ALARM, title, body, null);

        alarm.setLastFiredDate(today);
        alarmRepository.save(alarm);
        log.info("Alarm fired for user {} — {} → {} at {}", userId, alarm.getRouteFrom(), alarm.getRouteTo(), alarm.getDepartureTime());
    }

    private boolean departureRunsToday(FerryAlarm alarm, LocalDate today) {
        try {
            List<DepartureDto> departures = travelService.nextFrom(
                    alarm.getRouteFrom(), alarm.getRouteTo(), today, 0, null);
            return departures.stream()
                    .anyMatch(d -> alarm.getDepartureTime().equals(d.time()));
        } catch (Exception e) {
            log.warn("Could not verify schedule for alarm {}: {}", alarm.getId(), e.getMessage());
            return true; // send the notification rather than silently drop
        }
    }

    @Scheduled(cron = "0 0 3 * * *", zone = "Europe/Istanbul")
    @Transactional
    public void purgeUnverifiedUsers() {
        Instant cutoff = Instant.now().minus(24, ChronoUnit.HOURS);
        int deleted = userRepository.deleteUnverifiedBefore(cutoff);
        if (deleted > 0) {
            log.info("Purged {} unverified user account(s) older than 24h", deleted);
        }
    }

    private User currentUser() {
        String principal = (String) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        return userRepository.findById(UUID.fromString(principal))
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
    }

    private UUID currentUserId() {
        String principal = (String) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        return UUID.fromString(principal);
    }
}
