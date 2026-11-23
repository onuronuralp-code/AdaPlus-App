package app.adaplus.backend.service;

import com.twilio.Twilio;
import com.twilio.exception.TwilioException;
import com.twilio.rest.verify.v2.service.Verification;
import com.twilio.rest.verify.v2.service.VerificationCheck;
import jakarta.annotation.PostConstruct;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

@Service
@Slf4j
public class SmsService {

    @Value("${app.sms.enabled:false}")
    private boolean smsEnabled;

    @Value("${app.twilio.account-sid:}")
    private String accountSid;

    @Value("${app.twilio.auth-token:}")
    private String authToken;

    @Value("${app.twilio.verify-service-sid:}")
    private String verifyServiceSid;

    @PostConstruct
    void init() {
        if (smsEnabled) {
            Twilio.init(accountSid, authToken);
        }
    }

    public void sendOtp(String phone) {
        if (!smsEnabled) {
            log.info("[DEV] Twilio Verify: start verification for {}", phone);
            return;
        }
        try {
            Verification.creator(verifyServiceSid, phone, "sms").create();
        } catch (TwilioException e) {
            log.error("Failed to start Twilio verification for {}: {}", phone, e.getMessage());
        }
    }

    public boolean checkOtp(String phone, String code) {
        if (!smsEnabled) {
            // In dev mode accept any 6-digit code
            return code != null && code.matches("\\d{6}");
        }
        try {
            VerificationCheck check = VerificationCheck.creator(verifyServiceSid)
                    .setTo(phone)
                    .setCode(code)
                    .create();
            return "approved".equals(check.getStatus().toString());
        } catch (TwilioException e) {
            log.warn("OTP check failed for {}: {}", phone, e.getMessage());
            return false;
        }
    }
}
