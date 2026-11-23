CREATE TABLE IF NOT EXISTS service_provider_applications (
    id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    submitted_by       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    full_name          VARCHAR(255) NOT NULL,
    phone              VARCHAR(30) NOT NULL,
    island             VARCHAR(20) NOT NULL,
    category           VARCHAR(20) NOT NULL,
    offered_services   TEXT NOT NULL,
    experience_notes   TEXT,
    status             VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    rejection_reason   TEXT,
    created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_service_provider_applications_submitted_by ON service_provider_applications (submitted_by);
CREATE INDEX IF NOT EXISTS idx_service_provider_applications_status ON service_provider_applications (status);
