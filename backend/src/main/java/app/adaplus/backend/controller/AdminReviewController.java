package app.adaplus.backend.controller;

import app.adaplus.backend.dto.activity.ReviewRequest;
import app.adaplus.backend.entity.ReviewStatus;
import app.adaplus.backend.exception.AlreadyReviewedException;
import app.adaplus.backend.service.ActivityService;
import app.adaplus.backend.service.AdminTokenService;
import app.adaplus.backend.service.ListingService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;

import java.util.UUID;

@Controller
@RequestMapping("/api/v1/admin/email-review")
@RequiredArgsConstructor
@Slf4j
public class AdminReviewController {

    private final AdminTokenService tokenService;
    private final ActivityService activityService;
    private final ListingService listingService;

    /** Handles approve (immediate) or reject (shows form) link from admin email. */
    @GetMapping(produces = MediaType.TEXT_HTML_VALUE)
    public ResponseEntity<String> handleEmailLink(
            @RequestParam String action,
            @RequestParam String type,
            @RequestParam UUID id,
            @RequestParam String token) {

        if (!"approve".equals(action) && !"reject".equals(action)) {
            return bad("Geçersiz işlem.");
        }
        if (!tokenService.validateToken(token, type, id)) {
            return htmlStatus(HttpStatus.FORBIDDEN, page("Hata",
                    "<p class=\"tag\">ADAPLUS ADMIN</p><h1>⚠️ Geçersiz Bağlantı</h1>"
                    + "<p class=\"msg\">Bu onay bağlantısı geçersiz veya süresi dolmuş (7 gün).</p>"));
        }

        if ("approve".equals(action)) {
            try {
                doReview(type, id, ReviewStatus.APPROVED, null);
                String label = "listing".equals(type) ? "İlan" : "Etkinlik";
                log.info("[EmailReview] Approved {} {}", type, id);
                return htmlOk(page("Onaylandı",
                        "<p class=\"tag\">ADAPLUS ADMIN</p><h1>✅ Onaylandı</h1>"
                        + "<p class=\"msg\">" + label + " onaylandı ve yayına alındı. Kullanıcıya bildirim gönderildi.</p>"));
            } catch (AlreadyReviewedException e) {
                return alreadyDone(type, e.getCurrentStatus());
            } catch (Exception e) {
                log.error("[EmailReview] Approve failed for {} {}: {}", type, id, e.getMessage(), e);
                return bad("Onaylama sırasında bir hata oluştu. Lütfen tekrar deneyin.");
            }
        }

        return htmlOk(rejectForm(type, id, token, null));
    }

    /** Processes the rejection reason form submission. */
    @PostMapping(consumes = MediaType.APPLICATION_FORM_URLENCODED_VALUE, produces = MediaType.TEXT_HTML_VALUE)
    public ResponseEntity<String> submitRejection(
            @RequestParam String type,
            @RequestParam UUID id,
            @RequestParam String token,
            @RequestParam(defaultValue = "") String reason) {

        if (!tokenService.validateToken(token, type, id)) {
            return htmlStatus(HttpStatus.FORBIDDEN, page("Hata",
                    "<p class=\"tag\">ADAPLUS ADMIN</p><h1>⚠️ Geçersiz Bağlantı</h1>"
                    + "<p class=\"msg\">Bu bağlantı geçersiz veya süresi dolmuş.</p>"));
        }
        if (reason.isBlank()) {
            return htmlStatus(HttpStatus.BAD_REQUEST, rejectForm(type, id, token, "Ret sebebi boş bırakılamaz."));
        }
        try {
            doReview(type, id, ReviewStatus.REJECTED, reason.trim());
            String label = "listing".equals(type) ? "İlan" : "Etkinlik";
            log.info("[EmailReview] Rejected {} {} — reason: {}", type, id, reason);
            return htmlOk(page("Reddedildi",
                    "<p class=\"tag\">ADAPLUS ADMIN</p><h1>❌ Reddedildi</h1>"
                    + "<p class=\"msg\">" + label + " reddedildi. Kullanıcıya ret bildirimi gönderildi.</p>"));
        } catch (AlreadyReviewedException e) {
            return alreadyDone(type, e.getCurrentStatus());
        } catch (Exception e) {
            log.error("[EmailReview] Reject failed for {} {}: {}", type, id, e.getMessage(), e);
            return bad("Reddetme sırasında bir hata oluştu. Lütfen tekrar deneyin.");
        }
    }

    private void doReview(String type, UUID id, ReviewStatus status, String reason) {
        ReviewRequest req = new ReviewRequest(status, reason);
        if ("activity".equals(type)) activityService.review(id, req);
        else if ("listing".equals(type)) listingService.review(id, req);
        else throw new IllegalArgumentException("Unknown type: " + type);
    }

    private String rejectForm(String type, UUID id, String token, String error) {
        String label = "listing".equals(type) ? "İlan" : "Etkinlik";
        String errHtml = error != null
                ? "<p style=\"color:#ef4444;font-size:13px;margin:0 0 14px\">" + esc(error) + "</p>" : "";
        return page(label + " Reddet",
                "<p class=\"tag\">ADAPLUS ADMIN</p>"
                + "<h1>" + label + " Reddet</h1>"
                + errHtml
                + "<form method=\"POST\" action=\"/api/v1/admin/email-review\">"
                + "<input type=\"hidden\" name=\"type\" value=\"" + esc(type) + "\">"
                + "<input type=\"hidden\" name=\"id\" value=\"" + id + "\">"
                + "<input type=\"hidden\" name=\"token\" value=\"" + esc(token) + "\">"
                + "<label for=\"reason\">Ret Sebebi</label>"
                + "<select id=\"reason\" name=\"reason\">"
                + "<option value=\"\">Seçiniz...</option>"
                + "<option value=\"Uygunsuz içerik\">Uygunsuz içerik</option>"
                + "<option value=\"Eksik veya yanıltıcı bilgi\">Eksik veya yanıltıcı bilgi</option>"
                + "<option value=\"Uygulama kurallarına aykırı\">Uygulama kurallarına aykırı</option>"
                + "<option value=\"Spam veya tekrarlayan içerik\">Spam veya tekrarlayan içerik</option>"
                + "<option value=\"Reklam niteliği taşıyan içerik\">Reklam niteliği taşıyan içerik</option>"
                + "<option value=\"Diğer\">Diğer</option>"
                + "</select>"
                + "<button type=\"submit\" class=\"btn-reject\">❌ Reddet</button>"
                + "</form>");
    }

    private static final String CSP = "default-src 'none'; style-src 'unsafe-inline'; form-action 'self'";

    private ResponseEntity<String> htmlOk(String body) {
        return ResponseEntity.ok()
                .header("Content-Security-Policy", CSP)
                .contentType(MediaType.TEXT_HTML)
                .body(body);
    }

    private ResponseEntity<String> htmlStatus(HttpStatus status, String body) {
        return ResponseEntity.status(status)
                .header("Content-Security-Policy", CSP)
                .contentType(MediaType.TEXT_HTML)
                .body(body);
    }

    private ResponseEntity<String> alreadyDone(String type, ReviewStatus currentStatus) {
        String label = "listing".equals(type) ? "İlan" : "Etkinlik";
        String statusLabel = currentStatus == ReviewStatus.APPROVED ? "✅ onaylandı" : "❌ reddedildi";
        return htmlOk(page("Zaten İşleme Alındı",
                "<p class=\"tag\">ADAPLUS ADMIN</p><h1>ℹ️ Zaten İşleme Alındı</h1>"
                + "<p class=\"msg\">" + label + " daha önce diğer admin tarafından " + statusLabel + ". Tekrar işlem yapılmasına gerek yok.</p>"));
    }

    private ResponseEntity<String> bad(String msg) {
        return htmlStatus(HttpStatus.INTERNAL_SERVER_ERROR,
                page("Hata", "<p class=\"tag\">ADAPLUS ADMIN</p><h1>⚠️ Hata</h1><p class=\"msg\">" + esc(msg) + "</p>"));
    }

    private String page(String title, String body) {
        return "<!DOCTYPE html><html lang=\"tr\"><head>"
                + "<meta charset=\"UTF-8\"><meta name=\"viewport\" content=\"width=device-width,initial-scale=1\">"
                + "<title>" + esc(title) + " — AdaPlus</title>"
                + "<style>"
                + "*{box-sizing:border-box}"
                + "body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;"
                + "background:#0D1B2A;margin:0;min-height:100vh;display:flex;align-items:center;"
                + "justify-content:center;padding:24px}"
                + ".card{background:#1a2e45;border:1px solid #2a4060;border-radius:16px;"
                + "padding:36px 32px;max-width:440px;width:100%}"
                + ".tag{font-size:10px;font-weight:700;color:#64748b;letter-spacing:2px;margin:0 0 8px}"
                + "h1{font-size:22px;font-weight:800;color:#fff;margin:0 0 18px}"
                + "label{font-size:11px;font-weight:700;color:#94a3b8;display:block;margin-bottom:8px;"
                + "text-transform:uppercase;letter-spacing:1px}"
                + "select{width:100%;padding:12px;border:1px solid #2a4060;border-radius:8px;"
                + "background:#0D1B2A;color:#fff;font-size:14px;margin-bottom:18px;appearance:auto}"
                + ".btn-reject{background:#ef4444;color:#fff;border:none;width:100%;padding:14px;"
                + "border-radius:8px;cursor:pointer;font-size:15px;font-weight:700;letter-spacing:1px}"
                + ".msg{color:#94a3b8;font-size:15px;margin:0;line-height:1.6}"
                + "</style></head>"
                + "<body><div class=\"card\">" + body + "</div></body></html>";
    }

    private String esc(String s) {
        if (s == null) return "";
        return s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
                .replace("\"", "&quot;").replace("'", "&#39;");
    }
}
