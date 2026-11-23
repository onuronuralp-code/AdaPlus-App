package app.adaplus.backend.controller;

import app.adaplus.backend.dto.banner.BannerDto;
import app.adaplus.backend.dto.banner.SaveBannerRequest;
import app.adaplus.backend.service.BannerService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirements;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/banners")
@RequiredArgsConstructor
@Tag(name = "Banners", description = "Hero section promotional banners")
public class BannerController {

    private final BannerService bannerService;

    @Operation(summary = "Get active banner", description = "Returns the most recently created active banner, or 204 if none.")
    @SecurityRequirements
    @GetMapping("/active")
    public ResponseEntity<BannerDto> getActiveBanner() {
        return bannerService.getActiveBanner()
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.noContent().build());
    }

    @Operation(summary = "[ADMIN] List all banners")
    @GetMapping
    public List<BannerDto> getAllBanners() {
        return bannerService.getAllBanners();
    }

    @Operation(summary = "[ADMIN] Create banner")
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public BannerDto createBanner(@Valid @RequestBody SaveBannerRequest req) {
        return bannerService.create(req);
    }

    @Operation(summary = "[ADMIN] Update banner")
    @PutMapping("/{id}")
    public BannerDto updateBanner(@PathVariable UUID id, @Valid @RequestBody SaveBannerRequest req) {
        return bannerService.update(id, req);
    }

    @Operation(summary = "[ADMIN] Delete banner")
    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteBanner(@PathVariable UUID id) {
        bannerService.delete(id);
    }
}
