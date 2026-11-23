package app.adaplus.backend.controller;

import app.adaplus.backend.dto.schedule.BusDepartureDto;
import app.adaplus.backend.service.IslandBusService;
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
@RequestMapping("/api/v1/travel/buses")
@Tag(name = "Buses", description = "Upcoming island bus departures. No auth required.")
@SecurityRequirements
public class IslandBusController {

    private final IslandBusService islandBusService;

    public IslandBusController(IslandBusService islandBusService) {
        this.islandBusService = islandBusService;
    }

    @Operation(summary = "Get upcoming bus departures",
               description = "Returns upcoming departures for a given route, optionally filtered by stop and date.")
    @GetMapping("/departures")
    @Cacheable(value = "busDepartures", key = "#route + '_' + #stop + '_' + #date + '_' + #limit")
    public List<BusDepartureDto> getDepartures(
            @Parameter(description = "Route code, e.g. `BA-1`, `HA-1`, `KA-2`", required = true)
            @RequestParam String route,

            @Parameter(description = "Optional stop name filter")
            @RequestParam(required = false) String stop,

            @Parameter(description = "Date in ISO format (yyyy-MM-dd). Defaults to today.")
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date,

            @Parameter(description = "Max results to return. 0 = no limit.")
            @RequestParam(defaultValue = "0") int limit
    ) {
        return islandBusService.nextFrom(route, stop, date, limit);
    }
}
