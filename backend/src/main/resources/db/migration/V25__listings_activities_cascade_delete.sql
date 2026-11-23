-- Change submitted_by FK on listings and activities from SET NULL → CASCADE
-- so deleting a user also removes their listings and activities.

ALTER TABLE listings DROP CONSTRAINT listings_submitted_by_fkey;
ALTER TABLE listings ADD CONSTRAINT listings_submitted_by_fkey
    FOREIGN KEY (submitted_by) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE activities DROP CONSTRAINT activities_submitted_by_fkey;
ALTER TABLE activities ADD CONSTRAINT activities_submitted_by_fkey
    FOREIGN KEY (submitted_by) REFERENCES users(id) ON DELETE CASCADE;
