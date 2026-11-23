package app.adaplus.backend.controller;

import app.adaplus.backend.dto.activity.ActivityDto;
import app.adaplus.backend.dto.activity.CreateActivityRequest;
import app.adaplus.backend.dto.activity.ReviewRequest;
import app.adaplus.backend.dto.activity.RsvpResponse;
import app.adaplus.backend.dto.activity.UpdateActivityRequest;
import app.adaplus.backend.service.ActivityService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.security.SecurityRequirements;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/activities")
@RequiredArgsConstructor
@Tag(name = "Activities", description = "Island activities. Read endpoints are public. Write endpoints require ADMIN role.")
public class ActivityController {

    private final ActivityService activityService;

    @Operation(summary = "List all activities", description = "Returns all activities sorted by start date ascending. No auth required.")
    @SecurityRequirements
    @GetMapping
    public List<ActivityDto> getAllActivities() {
        return activityService.getAllActivities();
    }

    @Operation(
            summary = "Get upcoming activities",
            description = "Returns activities whose end date is today or in the future, sorted by start date. " +
                          "Designed for the hero slider. No auth required.")
    @SecurityRequirements
    @GetMapping("/upcoming")
    public List<ActivityDto> getUpcomingActivities(
            @Parameter(description = "Max number of activities to return. Defaults to 5.")
            @RequestParam(defaultValue = "5") int limit
    ) {
        return activityService.getUpcomingActivities(limit);
    }

    @Operation(summary = "Get activity by ID", description = "No auth required.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Activity found"),
            @ApiResponse(responseCode = "404", description = "Activity not found")
    })
    @SecurityRequirements
    @GetMapping("/{id}")
    public ActivityDto getActivity(@PathVariable UUID id) {
        return activityService.getActivity(id);
    }

    @Operation(summary = "Toggle RSVP for an activity", description = "Going / not going toggle. Requires authentication.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "RSVP toggled"),
            @ApiResponse(responseCode = "401", description = "Authentication required"),
            @ApiResponse(responseCode = "404", description = "Activity not found")
    })
    @PostMapping("/{id}/rsvp")
    public RsvpResponse toggleRsvp(@PathVariable UUID id) {
        return activityService.toggleRsvp(id);
    }

    @Operation(summary = "[ADMIN] List pending activities", description = "Returns activities awaiting review. Requires ADMIN role.")
    @GetMapping("/pending")
    public List<ActivityDto> getPendingActivities() {
        return activityService.getPendingActivities();
    }

    @Operation(summary = "[ADMIN] Review an activity", description = "Approve or reject a pending activity. Requires ADMIN role.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Review applied"),
            @ApiResponse(responseCode = "400", description = "Rejection reason required when declining"),
            @ApiResponse(responseCode = "403", description = "Admin role required"),
            @ApiResponse(responseCode = "404", description = "Activity not found")
    })
    @PostMapping("/{id}/review")
    public ActivityDto reviewActivity(@PathVariable UUID id, @Valid @RequestBody ReviewRequest req) {
        return activityService.review(id, req);
    }

    @Operation(summary = "[ADMIN] Create activity", description = "Requires ADMIN role.")
    @ApiResponses({
            @ApiResponse(responseCode = "201", description = "Activity created"),
            @ApiResponse(responseCode = "400", description = "Validation error or end date before start date"),
            @ApiResponse(responseCode = "401", description = "Missing or invalid JWT"),
            @ApiResponse(responseCode = "403", description = "Admin role required")
    })
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ActivityDto createActivity(@Valid @RequestBody CreateActivityRequest req) {
        return activityService.createActivity(req);
    }

    @Operation(summary = "Update activity", description = "Full replacement (PUT). Requires authentication. Users can only update their own activities. Admins can update any activity.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Activity updated"),
            @ApiResponse(responseCode = "400", description = "Validation error or end date before start date"),
            @ApiResponse(responseCode = "401", description = "Missing or invalid JWT"),
            @ApiResponse(responseCode = "403", description = "Not owner or Admin"),
            @ApiResponse(responseCode = "404", description = "Activity not found")
    })
    @PutMapping("/{id}")
    public ActivityDto updateActivity(@PathVariable UUID id,
                                      @Valid @RequestBody UpdateActivityRequest req) {
        return activityService.updateActivity(id, req);
    }

    @Operation(summary = "[ADMIN] Delete activity", description = "Requires ADMIN role.")
    @ApiResponses({
            @ApiResponse(responseCode = "204", description = "Activity deleted"),
            @ApiResponse(responseCode = "401", description = "Missing or invalid JWT"),
            @ApiResponse(responseCode = "403", description = "Admin role required"),
            @ApiResponse(responseCode = "404", description = "Activity not found")
    })
    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteActivity(@PathVariable UUID id) {
        activityService.deleteActivity(id);
    }
}
