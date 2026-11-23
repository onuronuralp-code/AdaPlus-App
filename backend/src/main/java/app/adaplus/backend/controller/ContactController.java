package app.adaplus.backend.controller;

import app.adaplus.backend.dto.contact.ContactRequest;
import app.adaplus.backend.service.ContactService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.security.SecurityRequirements;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/v1/contact")
@RequiredArgsConstructor
@Tag(name = "Contact", description = "Send a message to the Ada+ team")
@SecurityRequirements
public class ContactController {

    private final ContactService contactService;

    @Operation(summary = "Send a contact message",
               description = "Delivers the message to the Ada+ team email. No auth required.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Message sent"),
            @ApiResponse(responseCode = "400", description = "Validation error")
    })
    @PostMapping
    public Map<String, String> send(@Valid @RequestBody ContactRequest req) {
        contactService.send(req);
        return Map.of("message", "Your message has been sent. We'll get back to you soon!");
    }
}
