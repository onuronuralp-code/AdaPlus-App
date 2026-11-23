package app.adaplus.backend.service;

import app.adaplus.backend.dto.contact.ContactRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class ContactService {

    private final EmailService emailService;

    public void send(ContactRequest req) {
        emailService.sendContactEmail(
                req.fullName().trim(),
                req.email().trim().toLowerCase(),
                req.message().trim()
        );
    }
}
