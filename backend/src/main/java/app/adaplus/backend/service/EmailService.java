package app.adaplus.backend.service;

import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.MailException;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
@Slf4j
public class EmailService {

    private final JavaMailSender mailSender;

    @Value("${app.mail.from}")
    private String fromEmail;

    @Value("${app.frontend-url}")
    private String frontendUrl;

    @Value("${app.mail.contact-recipient}")
    private String contactRecipient;

    @Value("${app.email.enabled:true}")
    private boolean emailEnabled;

    @Value("${app.admin.notification-emails:}")
    private String adminNotificationEmails;

    @Value("${app.base-url:http://localhost:8080}")
    private String baseUrl;

    public void sendVerificationEmail(String to, String fullName, String code) {
        if (!emailEnabled) {
            log.info("[DEV] Verification code for {}: {}", to, code);
            return;
        }
        String body = """
                Hi %s,

                Welcome to AdaPlus! Your email verification code is:

                %s

                Enter this code in the app to verify your account.
                It expires in 15 minutes.

                If you did not create an account, you can safely ignore this email.

                — The AdaPlus Team
                """.formatted(fullName, code);
        send(to, "Your AdaPlus verification code", body);
    }

    public void sendAddEmailVerification(String to, String fullName, String code) {
        if (!emailEnabled) {
            log.info("[DEV] Add-email verification code for {}: {}", to, code);
            return;
        }
        String body = """
                Hi %s,

                You requested to add this email address to your AdaPlus account.
                Your verification code is:

                %s

                Enter this code in the app to confirm this email address.
                It expires in 15 minutes.

                If you did not request this, you can safely ignore this email.

                — The AdaPlus Team
                """.formatted(fullName, code);
        send(to, "Confirm your email for AdaPlus", body);
    }

    public void sendPasswordResetEmail(String to, String fullName, String token) {
        if (!emailEnabled) {
            log.info("[DEV] Password reset link for {}: {}/reset-password?token={}", to, frontendUrl, token);
            return;
        }
        String link = frontendUrl + "/reset-password?token=" + token;
        String body = """
                Hi %s,

                You requested to reset your AdaPlus password. Click the link below to set a new password:

                %s

                This link expires in 1 hour.

                If you did not request a password reset, you can safely ignore this email.

                — The AdaPlus Team
                """.formatted(fullName, link);
        send(to, "Reset your AdaPlus password", body);
    }

    public void sendIslandInviteEmail(String to, String token) {
        if (!emailEnabled) {
            log.info("[DEV] Island invite link for {}: /signup?inviteToken={}", to, token);
            return;
        }
        String link = frontendUrl + "/signup?inviteToken=" + token;
        String body = """
                Merhaba,

                AdaPlus'a ada sakini olarak katılmaya davet edildiniz!

                Aşağıdaki bağlantıya tıklayarak kayıt olun:

                %s

                Bu davet 7 gün içinde geçerliliğini yitirecektir.

                — AdaPlus Ekibi
                """.formatted(link);
        send(to, "AdaPlus'a davet edildiniz!", body);
    }

    public void sendContactEmail(String fullName, String replyTo, String message) {
        if (!emailEnabled) {
            log.info("[DEV] Contact message from {} <{}>: {}", fullName, replyTo, message);
            return;
        }
        String body = """
                You have a new message from the AdaPlus app.

                From:    %s
                Email:   %s

                Message:
                %s
                """.formatted(fullName, replyTo, message);
        send(contactRecipient, "AdaPlus Contact: " + fullName, body);
    }

    public void notifyAdminNewActivity(String activityId, String name, String organizerName,
                                        String startDate, String endDate, String place,
                                        String description, String submitterName, String submitterEmail,
                                        String approveToken) {
        if (adminNotificationEmails.isBlank()) {
            log.warn("[AdminEmail] ADMIN_NOTIFICATION_EMAILS not set — skipping admin notification");
            return;
        }
        if (!emailEnabled) {
            log.info("[DEV] New activity pending review: {} (id={})", name, activityId);
            return;
        }
        String approveUrl = baseUrl + "/api/v1/admin/email-review?action=approve&type=activity&id=" + activityId + "&token=" + approveToken;
        String rejectUrl  = baseUrl + "/api/v1/admin/email-review?action=reject&type=activity&id="  + activityId + "&token=" + approveToken;
        String subject = "[Onay Gerekli] Yeni Etkinlik: \"" + name + "\"";
        String html = adminEmailHtml("Yeni Etkinlik Başvurusu", new String[][]{
                {"Ad", name}, {"Organizatör", organizerName},
                {"Tarih", startDate + " — " + endDate}, {"Yer", place},
                {"Açıklama", description}, {"Gönderen", submitterName + " (" + submitterEmail + ")"}
        }, approveUrl, rejectUrl);
        for (String email : adminNotificationEmails.split(",")) {
            sendHtml(email.strip(), subject, html);
        }
    }

    public void notifyAdminNewListing(String listingId, String title, String category,
                                       String island, String price, String contactInfo,
                                       String description, String submitterName, String submitterEmail,
                                       String approveToken) {
        if (adminNotificationEmails.isBlank()) {
            log.warn("[AdminEmail] ADMIN_NOTIFICATION_EMAILS not set — skipping admin notification");
            return;
        }
        if (!emailEnabled) {
            log.info("[DEV] New listing pending review: {} (id={})", title, listingId);
            return;
        }
        String approveUrl = baseUrl + "/api/v1/admin/email-review?action=approve&type=listing&id=" + listingId + "&token=" + approveToken;
        String rejectUrl  = baseUrl + "/api/v1/admin/email-review?action=reject&type=listing&id="  + listingId + "&token=" + approveToken;
        String subject = "[Onay Gerekli] Yeni İlan: \"" + title + "\"";
        String html = adminEmailHtml("Yeni İlan Başvurusu", new String[][]{
                {"Başlık", title}, {"Kategori", category}, {"Ada", island},
                {"Fiyat", price}, {"İletişim", contactInfo}, {"Açıklama", description},
                {"Gönderen", submitterName + " (" + submitterEmail + ")"}
        }, approveUrl, rejectUrl);
        for (String email : adminNotificationEmails.split(",")) {
            sendHtml(email.strip(), subject, html);
        }
    }

    private String adminEmailHtml(String heading, String[][] fields, String approveUrl, String rejectUrl) {
        StringBuilder rows = new StringBuilder();
        for (String[] field : fields) {
            if (field[1] != null && !field[1].isBlank()) {
                rows.append("<tr><td class=\"lbl\">").append(esc(field[0])).append("</td>")
                    .append("<td class=\"val\">").append(esc(field[1])).append("</td></tr>");
            }
        }
        return "<!DOCTYPE html><html><head><meta charset=\"UTF-8\">"
                + "<style>"
                + "body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;"
                + "background:#f4f6f8;margin:0;padding:32px 16px}"
                + ".card{background:#fff;border-radius:12px;max-width:600px;margin:0 auto;"
                + "padding:32px;border:1px solid #e0e4e8}"
                + ".tag{font-size:11px;font-weight:700;color:#999;letter-spacing:2px;"
                + "text-transform:uppercase;margin:0 0 6px}"
                + "h1{font-size:20px;color:#1E3A5F;margin:0 0 24px;font-weight:800}"
                + "table{width:100%;border-collapse:collapse;margin-bottom:28px}"
                + "td{padding:8px 6px;vertical-align:top;font-size:14px;border-bottom:1px solid #f0f0f0}"
                + ".lbl{font-weight:600;color:#666;width:130px;white-space:nowrap}"
                + ".val{color:#1a1a1a}"
                + ".actions{display:flex;gap:12px;flex-wrap:wrap}"
                + ".btn{display:inline-block;padding:14px 28px;border-radius:8px;"
                + "font-size:15px;font-weight:700;text-decoration:none;text-align:center}"
                + ".approve{background:#22c55e;color:#fff}"
                + ".reject{background:#ef4444;color:#fff}"
                + ".footer{font-size:12px;color:#aaa;margin-top:24px}"
                + "</style></head><body>"
                + "<div class=\"card\">"
                + "<p class=\"tag\">AdaPlus Admin</p>"
                + "<h1>" + esc(heading) + "</h1>"
                + "<table>" + rows + "</table>"
                + "<div class=\"actions\">"
                + "<a href=\"" + approveUrl + "\" class=\"btn approve\">✅ Onayla</a>"
                + "<a href=\"" + rejectUrl  + "\" class=\"btn reject\">❌ Reddet</a>"
                + "</div>"
                + "<p class=\"footer\">Bu bağlantılar 7 gün geçerlidir.</p>"
                + "</div></body></html>";
    }

    private String esc(String s) {
        if (s == null) return "";
        return s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;");
    }

    private void sendHtml(String to, String subject, String html) {
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, false, "UTF-8");
            helper.setFrom(fromEmail);
            helper.setTo(to);
            helper.setSubject(subject);
            helper.setText(html, true);
            mailSender.send(message);
        } catch (MailException | MessagingException e) {
            log.error("Failed to send HTML email to {}: {}", to, e.getMessage());
        }
    }

    private void send(String to, String subject, String body) {
        try {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setFrom(fromEmail);
            message.setTo(to);
            message.setSubject(subject);
            message.setText(body);
            mailSender.send(message);
        } catch (MailException e) {
            log.error("Failed to send email to {}: {}", to, e.getMessage());
            // Email failure does not fail the request — the user can request a resend
        }
    }
}
