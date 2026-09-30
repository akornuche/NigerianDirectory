-- ============================================
-- CONTACT SUBMISSIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS contact_submissions (
    id SERIAL PRIMARY KEY,
    uuid UUID DEFAULT uuid_generate_v4() UNIQUE,
    
    -- Submitter info
    name VARCHAR(120) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(30),
    subject VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    
    -- Categorisation
    submission_type VARCHAR(30) DEFAULT 'contact'
        CHECK (submission_type IN ('contact', 'school_ownership', 'report_error', 'advertise', 'other')),
    
    -- School reference (optional — for ownership/report submissions)
    school_id INT REFERENCES schools(id) ON DELETE SET NULL,
    school_name VARCHAR(200),   -- denormalised so we keep it even if school deleted
    
    -- For school ownership requests
    requester_role VARCHAR(80),          -- e.g. "Principal", "School Owner", "Board Member"
    organisation_name VARCHAR(200),
    verification_notes TEXT,
    
    -- Admin workflow
    status VARCHAR(20) DEFAULT 'new'
        CHECK (status IN ('new', 'read', 'replied', 'archived')),
    admin_notes TEXT,
    replied_by INT REFERENCES users(id) ON DELETE SET NULL,
    replied_at TIMESTAMP,
    
    -- Meta
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_contact_submissions_type   ON contact_submissions(submission_type);
CREATE INDEX idx_contact_submissions_status ON contact_submissions(status);
CREATE INDEX idx_contact_submissions_school ON contact_submissions(school_id);
CREATE INDEX idx_contact_submissions_date   ON contact_submissions(created_at DESC);

-- Auto-update updated_at
CREATE TRIGGER update_contact_submissions_updated_at
    BEFORE UPDATE ON contact_submissions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
