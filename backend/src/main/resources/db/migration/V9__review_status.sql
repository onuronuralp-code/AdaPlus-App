ALTER TABLE activities
    ADD COLUMN status           VARCHAR(20) NOT NULL DEFAULT 'APPROVED',
    ADD COLUMN rejection_reason TEXT;

ALTER TABLE listings
    ADD COLUMN status           VARCHAR(20) NOT NULL DEFAULT 'APPROVED',
    ADD COLUMN rejection_reason TEXT;
