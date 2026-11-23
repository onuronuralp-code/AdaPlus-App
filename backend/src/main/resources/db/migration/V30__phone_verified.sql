ALTER TABLE users ADD COLUMN phone_verified BOOLEAN NOT NULL DEFAULT FALSE;

-- Backfill: users who signed up with phone only (no email) and already completed
-- their signup OTP had their phone number proven via Twilio Verify at that time.
UPDATE users
SET phone_verified = TRUE
WHERE phone IS NOT NULL
  AND email IS NULL
  AND email_verified = TRUE;
