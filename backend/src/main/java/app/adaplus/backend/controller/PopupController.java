package app.adaplus.backend.controller;

import app.adaplus.backend.dto.popup.PopupDto;
import app.adaplus.backend.dto.popup.SavePopupRequest;
import app.adaplus.backend.service.PopupService;
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
@RequestMapping("/api/v1/popups")
@RequiredArgsConstructor
@Tag(name = "Popups", description = "Full-screen promotional popups (e.g. business campaign announcements)")
public class PopupController {

    private final PopupService popupService;

    @Operation(summary = "Get active popup", description = "Returns the most recently created active popup, or 204 if none.")
    @SecurityRequirements
    @GetMapping("/active")
    public ResponseEntity<PopupDto> getActivePopup() {
        return popupService.getActivePopup()
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.noContent().build());
    }

    @Operation(summary = "[ADMIN] List all popups")
    @GetMapping
    public List<PopupDto> getAllPopups() {
        return popupService.getAllPopups();
    }

    @Operation(summary = "[ADMIN] Create popup")
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public PopupDto createPopup(@Valid @RequestBody SavePopupRequest req) {
        return popupService.create(req);
    }

    @Operation(summary = "[ADMIN] Update popup")
    @PutMapping("/{id}")
    public PopupDto updatePopup(@PathVariable UUID id, @Valid @RequestBody SavePopupRequest req) {
        return popupService.update(id, req);
    }

    @Operation(summary = "[ADMIN] Delete popup")
    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deletePopup(@PathVariable UUID id) {
        popupService.delete(id);
    }
}
