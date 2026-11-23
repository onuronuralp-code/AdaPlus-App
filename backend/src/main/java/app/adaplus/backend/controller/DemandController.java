package app.adaplus.backend.controller;

import app.adaplus.backend.dto.demand.DeliveryVoteRequest;
import app.adaplus.backend.service.DemandService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/v1/demand")
@RequiredArgsConstructor
@Tag(name = "Demand", description = "Demand-gathering surveys — delivery service interest.")
public class DemandController {

    private final DemandService demandService;

    @Operation(summary = "Submit delivery demand vote",
               description = "Accepts one vote per authenticated user. Options: CARGO, SUPERMARKET, WATER_GAS, OTHER.")
    @PostMapping("/delivery")
    @ResponseStatus(HttpStatus.CREATED)
    public void voteDelivery(@Valid @RequestBody DeliveryVoteRequest req) {
        demandService.voteDelivery(req);
    }

    @Operation(summary = "Get delivery demand stats", description = "Admin only. Returns vote count per option.")
    @GetMapping("/delivery")
    public Map<String, Long> getDeliveryStats() {
        return demandService.getDeliveryStats();
    }
}
