package app.adaplus.backend.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;

import java.util.concurrent.atomic.AtomicBoolean;

/**
 * Runtime kill-switch for the forum.
 *
 * Initial state comes from the FORUM_ENABLED env var (defaults to true).
 * An admin can flip it live via POST /api/v1/admin/forum/status without a
 * restart. Setting FORUM_ENABLED=false and restarting gives a permanent-off
 * state that survives the toggle being reset.
 */
@Component
public class ForumToggle {

    private final AtomicBoolean enabled;

    public ForumToggle(@Value("${app.forum.enabled:true}") boolean initiallyEnabled) {
        this.enabled = new AtomicBoolean(initiallyEnabled);
    }

    public boolean isEnabled() {
        return enabled.get();
    }

    public void setEnabled(boolean value) {
        enabled.set(value);
    }

    /** Throws 503 for non-admins when the forum is disabled. Admins bypass so they can still moderate. */
    public void requireEnabled(boolean callerIsAdmin) {
        if (!enabled.get() && !callerIsAdmin) {
            throw new ResponseStatusException(
                    HttpStatus.SERVICE_UNAVAILABLE,
                    "Forum is temporarily unavailable. Please check back later.");
        }
    }
}
