package app.adaplus.backend.controller;

import app.adaplus.backend.dto.activity.ReviewRequest;
import app.adaplus.backend.dto.listing.ListingDto;
import app.adaplus.backend.dto.listing.SaveListingRequest;
import app.adaplus.backend.entity.ListingCategory;
import app.adaplus.backend.service.ListingService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.security.SecurityRequirements;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/listings")
@RequiredArgsConstructor
@Tag(name = "Listings", description = "Island listings — rentals, sales, services. Read public. Write requires ADMIN.")
public class ListingController {

    private final ListingService listingService;

    @Operation(summary = "List active listings", description = "Paginated, newest first. Optional category filter. No auth required.")
    @SecurityRequirements
    @GetMapping
    public Page<ListingDto> getListings(
            @Parameter(description = "Filter: SATILIK, KIRALIK, HIZMET, DIGER")
            @RequestParam(required = false) ListingCategory category,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size
    ) {
        return listingService.getListings(category, page, size);
    }

    @Operation(summary = "Get listing by ID", description = "No auth required.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Listing found"),
            @ApiResponse(responseCode = "404", description = "Listing not found")
    })
    @SecurityRequirements
    @GetMapping("/{id}")
    public ListingDto getListing(@PathVariable UUID id) {
        return listingService.getListing(id);
    }

    @Operation(summary = "[ADMIN] List pending listings", description = "Returns listings awaiting review. Requires ADMIN role.")
    @GetMapping("/pending")
    public List<ListingDto> getPendingListings() {
        return listingService.getPendingListings();
    }

    @Operation(summary = "[ADMIN] Review a listing", description = "Approve or reject a pending listing. Requires ADMIN role.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Review applied"),
            @ApiResponse(responseCode = "400", description = "Rejection reason required when declining"),
            @ApiResponse(responseCode = "403", description = "Admin role required"),
            @ApiResponse(responseCode = "404", description = "Listing not found")
    })
    @PostMapping("/{id}/review")
    public ListingDto reviewListing(@PathVariable UUID id, @Valid @RequestBody ReviewRequest req) {
        return listingService.review(id, req);
    }

    @Operation(summary = "[ADMIN] Create listing")
    @ApiResponses({
            @ApiResponse(responseCode = "201", description = "Listing created"),
            @ApiResponse(responseCode = "400", description = "Validation error"),
            @ApiResponse(responseCode = "403", description = "Admin role required")
    })
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ListingDto createListing(@Valid @RequestBody SaveListingRequest req) {
        return listingService.createListing(req);
    }

    @Operation(summary = "Update listing", description = "Requires authentication. Users can only update their own listings. Admins can update any listing.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Listing updated"),
            @ApiResponse(responseCode = "400", description = "Validation error"),
            @ApiResponse(responseCode = "401", description = "Missing or invalid JWT"),
            @ApiResponse(responseCode = "403", description = "Not owner or Admin"),
    })
    @PutMapping("/{id}")
    public ListingDto updateListing(@PathVariable UUID id, @Valid @RequestBody SaveListingRequest req) {
        return listingService.updateListing(id, req);
    }

    @Operation(summary = "[ADMIN] Delete listing")
    @ApiResponses({
            @ApiResponse(responseCode = "204", description = "Listing deleted"),
            @ApiResponse(responseCode = "404", description = "Listing not found"),
            @ApiResponse(responseCode = "403", description = "Admin role required")
    })
    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteListing(@PathVariable UUID id) {
        listingService.deleteListing(id);
    }
}
