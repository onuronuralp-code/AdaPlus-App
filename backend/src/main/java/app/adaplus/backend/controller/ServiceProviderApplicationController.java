package app.adaplus.backend.controller;

import app.adaplus.backend.dto.providerapplication.CreateServiceProviderApplicationRequest;
import app.adaplus.backend.dto.providerapplication.ReviewRequest;
import app.adaplus.backend.dto.providerapplication.ServiceProviderApplicationDto;
import app.adaplus.backend.service.ServiceProviderApplicationService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/provider-applications")
@RequiredArgsConstructor
@Tag(name = "Service Provider Applications", description = "Users applying to join the local service provider network. Review endpoints require ADMIN role.")
public class ServiceProviderApplicationController {

    private final ServiceProviderApplicationService applicationService;

    @Operation(summary = "Apply as a local service provider", description = "Requires authentication.")
    @ApiResponses({
            @ApiResponse(responseCode = "201", description = "Application submitted"),
            @ApiResponse(responseCode = "400", description = "Validation error"),
            @ApiResponse(responseCode = "401", description = "Authentication required")
    })
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ServiceProviderApplicationDto submitApplication(@Valid @RequestBody CreateServiceProviderApplicationRequest req) {
        return applicationService.submitApplication(req);
    }

    @Operation(summary = "List my own applications", description = "Returns all applications the current user has submitted, in any review state. Requires authentication.")
    @GetMapping("/me")
    public List<ServiceProviderApplicationDto> getMyApplications(@AuthenticationPrincipal String userId) {
        return applicationService.getMyApplications(UUID.fromString(userId));
    }

    @Operation(summary = "[ADMIN] List pending applications", description = "Returns applications awaiting review. Requires ADMIN role.")
    @GetMapping("/pending")
    public List<ServiceProviderApplicationDto> getPendingApplications() {
        return applicationService.getPendingApplications();
    }

    @Operation(summary = "[ADMIN] Review an application", description = "Approve or reject a pending application. Requires ADMIN role.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Review applied"),
            @ApiResponse(responseCode = "400", description = "Rejection reason required when declining"),
            @ApiResponse(responseCode = "403", description = "Admin role required"),
            @ApiResponse(responseCode = "404", description = "Application not found"),
            @ApiResponse(responseCode = "409", description = "Application already reviewed")
    })
    @PostMapping("/{id}/review")
    public ServiceProviderApplicationDto reviewApplication(@PathVariable UUID id, @Valid @RequestBody ReviewRequest req) {
        return applicationService.review(id, req);
    }
}
