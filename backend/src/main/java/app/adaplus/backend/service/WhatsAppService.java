package app.adaplus.backend.service;

import com.twilio.Twilio;
import com.twilio.exception.TwilioException;
import com.twilio.rest.api.v2010.account.Message;
import com.twilio.type.PhoneNumber;
import jakarta.annotation.PostConstruct;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

@Service
@Slf4j
public class WhatsAppService {

    @Value("${app.whatsapp.enabled:false}")
    private boolean whatsappEnabled;

    @Value("${app.twilio.account-sid:}")
    private String accountSid;

    @Value("${app.twilio.auth-token:}")
    private String authToken;

    @Value("${app.whatsapp.from-number:}")
    private String fromNumber;

    @PostConstruct
    void init() {
        // Twilio.init just sets static SDK credentials — safe to call again even if
        // SmsService already initialized it for the same account.
        if (whatsappEnabled) {
            Twilio.init(accountSid, authToken);
        }
    }

    public boolean sendOrderMessage(String toNumber, String body) {
        if (!whatsappEnabled) {
            log.info("[DEV] WhatsApp order message to {}: {}", toNumber, body);
            return false;
        }
        try {
            Message.creator(
                    new PhoneNumber("whatsapp:" + toNumber),
                    new PhoneNumber("whatsapp:" + fromNumber),
                    body
            ).create();
            return true;
        } catch (TwilioException e) {
            log.error("Failed to send WhatsApp order message to {}: {}", toNumber, e.getMessage());
            return false;
        }
    }
}
