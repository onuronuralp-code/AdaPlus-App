package app.adaplus.backend.controller;

import app.adaplus.backend.dto.schedule.DepartureDto;
import app.adaplus.backend.service.TravelService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.security.SecurityRequirements;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/v1/travel/ferries")
@Tag(name = "Ferries", description = "Upcoming ferry departures. No auth required.")
@SecurityRequirements
public class TravelController {

    private final TravelService travelService;

    public TravelController(TravelService travelService) {
        this.travelService = travelService;
    }

    @Operation(summary = "Get upcoming ferry departures",
               description = "Returns upcoming departures from a given origin, optionally filtered by destination and date.")
    @GetMapping("/departures")
    @Cacheable(value = "ferryDepartures",
               key = "#from + '_' + #to + '_' + #date + '_' + #limit + '_' + #includeNextDayUntil")
    public List<DepartureDto> getDepartures(
            @Parameter(description = "Departure point, e.g. `kadıköy`, `beşiktaş`, `büyükada`", required = true)
            @RequestParam String from,

            @Parameter(description = "Optional destination or intermediate stop filter")
            @RequestParam(required = false) String to,

            @Parameter(description = "Date in ISO format (yyyy-MM-dd). Defaults to today.")
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date,

            @Parameter(description = "Max results to return. 0 = no limit.")
            @RequestParam(defaultValue = "0") int limit,

            @Parameter(description = "Include early next-day departures until this time, e.g. `03:00`.")
            @RequestParam(defaultValue = "03:00") String includeNextDayUntil
    ) {
        return travelService.nextFrom(from, to, date, limit, includeNextDayUntil);
    }
}
