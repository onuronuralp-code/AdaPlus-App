-- Distinguishes "verify the email I already have" (signup) rows from
-- "verify this new candidate email before attaching it to my account" rows.
-- NULL means the former (existing signup-verification behavior).
ALTER TABLE email_verifications ADD COLUMN pending_email VARCHAR(255);
