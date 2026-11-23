-- Resize island column to match Island enum values (max "HEYBELIADA" = 10 chars, 20 is safe)
ALTER TABLE listings ALTER COLUMN island TYPE VARCHAR(20);

-- No data migration needed for category since DIGER was never used in prod
-- IS_ILANI and KAYIP are new values added at the Java enum level
