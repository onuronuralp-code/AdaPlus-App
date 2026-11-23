package app.adaplus.backend.controller;

import app.adaplus.backend.dto.alarm.CreateFerryAlarmRequest;
import app.adaplus.backend.dto.alarm.FerryAlarmDto;
import app.adaplus.backend.service.FerryAlarmService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/alarms")
@RequiredArgsConstructor
public class FerryAlarmController {

    private final FerryAlarmService ferryAlarmService;

    @GetMapping
    public List<FerryAlarmDto> getMyAlarms() {
        return ferryAlarmService.getUserAlarms();
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public FerryAlarmDto createAlarm(@Valid @RequestBody CreateFerryAlarmRequest req) {
        return ferryAlarmService.createAlarm(req);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteAlarm(@PathVariable UUID id) {
        ferryAlarmService.deleteAlarm(id);
    }
}
