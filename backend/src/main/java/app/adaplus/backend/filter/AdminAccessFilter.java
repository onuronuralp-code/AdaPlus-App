package app.adaplus.backend.filter;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

@Component
@Slf4j
public class AdminAccessFilter extends OncePerRequestFilter {

    private static final String COOKIE_NAME = "ada_admin";

    private final String uiSecret;

    public AdminAccessFilter(@Value("${app.admin.ui-secret:}") String uiSecret) {
        this.uiSecret = uiSecret;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest req, HttpServletResponse res, FilterChain chain)
            throws ServletException, IOException {

        if (uiSecret.isBlank()) {
            res.setStatus(HttpStatus.FORBIDDEN.value());
            res.setContentType("text/plain;charset=UTF-8");
            res.getWriter().write("Admin UI is disabled. Set ADMIN_UI_SECRET env var to enable.");
            log.warn("[ADMIN] Access denied — ADMIN_UI_SECRET not configured");
            return;
        }

        // Valid session cookie bypasses the prompt
        Cookie[] cookies = req.getCookies();
        if (cookies != null) {
            for (Cookie c : cookies) {
                if (COOKIE_NAME.equals(c.getName()) && uiSecret.equals(c.getValue())) {
                    chain.doFilter(req, res);
                    return;
                }
            }
        }

        // POST body token sets the session cookie
        if ("POST".equalsIgnoreCase(req.getMethod())) {
            String token = req.getParameter("s");
            if (uiSecret.equals(token)) {
                // Set cookie via raw header to include SameSite=Strict (Servlet API has no setSameSite)
                res.setHeader("Set-Cookie", String.format(
                        "%s=%s; Path=/admin; HttpOnly; Secure; SameSite=Strict; Max-Age=3600",
                        COOKIE_NAME, uiSecret));
                res.sendRedirect(req.getRequestURI());
                return;
            }
        }

        // Show minimal password gate
        res.setStatus(HttpStatus.UNAUTHORIZED.value());
        res.setContentType("text/html;charset=UTF-8");
        res.setHeader("Content-Security-Policy", "default-src 'none'; style-src 'unsafe-inline'; form-action 'self'");
        res.getWriter().write("""
                <!DOCTYPE html><html><head><meta charset="UTF-8">
                <title>Ada+ — Erişim</title>
                <style>
                body{font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;background:#0D1B2A;}
                .box{background:#1a2e45;padding:36px 32px;border-radius:12px;display:flex;flex-direction:column;gap:14px;min-width:300px;border:1px solid #2a4060;}
                .label{font-size:11px;font-weight:700;color:#64748b;letter-spacing:2px;}
                .title{font-size:20px;font-weight:800;color:#fff;margin:0;}
                .hint{font-size:12px;color:#64748b;margin:-6px 0 4px;}
                input{padding:12px;border:1px solid #2a4060;border-radius:8px;font-size:14px;background:#0D1B2A;color:#fff;}
                button{background:#EA580C;color:white;border:none;padding:12px;border-radius:8px;cursor:pointer;font-size:14px;font-weight:700;letter-spacing:1px;}
                </style></head><body>
                <div class="box">
                  <span class="label">ADAPLUS ADMIN</span>
                  <p class="title">Panel Erişimi</p>
                  <p class="hint">Bu form JWT token değil, sunucu erişim şifresi ister (ADMIN_UI_SECRET).</p>
                  <form method="POST">
                    <input name="s" type="password" placeholder="Erişim şifresi" autocomplete="current-password" autofocus/>
                    <button type="submit">GİRİŞ</button>
                  </form>
                </div></body></html>""");
    }

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        return !request.getRequestURI().startsWith("/admin");
    }
}
