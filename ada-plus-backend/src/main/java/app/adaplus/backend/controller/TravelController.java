package app.adaplus.backend.controller;

import app.adaplus.backend.dto.DepartureDto;
import app.adaplus.backend.service.TravelService;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.*;
import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/v1/travel")
public class TravelController {

    private final TravelService travelService;

    public TravelController(TravelService travelService) {
        this.travelService = travelService;
    }

    @GetMapping("/departures")
    public List<DepartureDto> getDepartures(
            @RequestParam String from,
            @RequestParam(required = false) String to,
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date,
            @RequestParam(defaultValue = "0") int limit,
            @RequestParam(defaultValue = "03:00") String includeNextDayUntil
    ) {
        return travelService.nextFrom(from, to, date, limit, includeNextDayUntil);
    }
}