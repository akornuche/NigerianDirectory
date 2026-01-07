-- NigerianDirectory.com Database Schema
-- Initial setup script for PostgreSQL

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- USERS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    uuid UUID DEFAULT uuid_generate_v4() UNIQUE,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'user' CHECK (role IN ('admin', 'school-owner', 'user')),
    email_verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- LOCATIONS TABLE (Nigerian States/Cities/Areas)
-- ============================================
CREATE TABLE IF NOT EXISTS locations (
    id SERIAL PRIMARY KEY,
    country VARCHAR(100) DEFAULT 'Nigeria',
    state VARCHAR(100) NOT NULL,
    city VARCHAR(100),
    area VARCHAR(100),
    slug VARCHAR(100) NOT NULL,
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    population INT,
    is_major_city BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(state, city, area)
);

-- Create index for location lookups
CREATE INDEX idx_locations_state ON locations(state);
CREATE INDEX idx_locations_slug ON locations(slug);
CREATE INDEX idx_locations_city ON locations(city);

-- ============================================
-- SCHOOLS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS schools (
    id SERIAL PRIMARY KEY,
    uuid UUID DEFAULT uuid_generate_v4() UNIQUE,
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    type VARCHAR(50) CHECK (type IN ('private', 'public', 'international', 'federal', 'state', 'mission', 'community')),
    state VARCHAR(100) NOT NULL,
    city VARCHAR(100),
    area VARCHAR(100),
    address TEXT,
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    curriculum VARCHAR(100),
    levels VARCHAR(100),
    boarding BOOLEAN DEFAULT FALSE,
    day_school BOOLEAN DEFAULT TRUE,
    gender VARCHAR(20) CHECK (gender IN ('co-ed', 'boys-only', 'girls-only')),
    phone VARCHAR(50),
    email VARCHAR(100),
    website VARCHAR(255),
    social_links JSONB DEFAULT '{}',
    
    -- AI/Template Summary Fields
    template_summary TEXT,
    ai_summary TEXT,
    needs_ai_enrichment BOOLEAN DEFAULT TRUE,
    summary_template_id VARCHAR(50),
    
    -- Additional Info
    established_year INT,
    principal_name VARCHAR(150),
    principal_title VARCHAR(100),
    principal_image_url VARCHAR(500),
    management_info JSONB DEFAULT '[]',
    facilities JSONB DEFAULT '[]',
    achievements JSONB DEFAULT '[]',
    student_life JSONB DEFAULT '{}',
    fee_range VARCHAR(100),
    student_count INT,
    
    -- Images
    logo_url VARCHAR(500),
    hero_image_url VARCHAR(500),
    gallery_images JSONB DEFAULT '[]',
    
    -- Claim & Verification
    claimed BOOLEAN DEFAULT FALSE,
    verified BOOLEAN DEFAULT FALSE,
    claimed_by_user_id INT REFERENCES users(id),
    claimed_at TIMESTAMP,
    verified_at TIMESTAMP,
    
    -- SEO Fields
    meta_title VARCHAR(255),
    meta_description TEXT,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for school queries
CREATE INDEX idx_schools_slug ON schools(slug);
CREATE INDEX idx_schools_state ON schools(state);
CREATE INDEX idx_schools_city ON schools(city);
CREATE INDEX idx_schools_area ON schools(area);
CREATE INDEX idx_schools_type ON schools(type);
CREATE INDEX idx_schools_claimed ON schools(claimed);
CREATE INDEX idx_schools_needs_enrichment ON schools(needs_ai_enrichment);
CREATE INDEX idx_schools_state_area ON schools(state, area);

-- Full-text search index
CREATE INDEX idx_schools_name_search ON schools USING gin(to_tsvector('english', name));

-- ============================================
-- CRAWL LOGS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS crawl_logs (
    id SERIAL PRIMARY KEY,
    school_id INT REFERENCES schools(id) ON DELETE CASCADE,
    source_url TEXT,
    source_name VARCHAR(100),
    crawl_status VARCHAR(20) CHECK (crawl_status IN ('success', 'failure', 'partial', 'pending')),
    raw_data JSONB,
    parsed_data JSONB,
    confidence_score DECIMAL(3, 2),
    error_message TEXT,
    last_crawled TIMESTAMP DEFAULT NOW(),
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_crawl_logs_school ON crawl_logs(school_id);
CREATE INDEX idx_crawl_logs_status ON crawl_logs(crawl_status);

-- ============================================
-- CLAIMS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS claims (
    id SERIAL PRIMARY KEY,
    uuid UUID DEFAULT uuid_generate_v4() UNIQUE,
    school_id INT REFERENCES schools(id) ON DELETE CASCADE,
    user_id INT REFERENCES users(id) ON DELETE CASCADE,
    
    -- Verification Details
    verification_method VARCHAR(50) CHECK (verification_method IN ('email', 'phone', 'document', 'visit')),
    verification_documents JSONB DEFAULT '[]',
    verification_notes TEXT,
    verified BOOLEAN DEFAULT FALSE,
    verified_by INT REFERENCES users(id),
    verified_at TIMESTAMP,
    
    -- Payment Details
    payment_status VARCHAR(50) DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'failed', 'refunded')),
    payment_amount DECIMAL(10, 2),
    payment_reference VARCHAR(100),
    payment_provider VARCHAR(50),
    paid_at TIMESTAMP,
    
    -- Status
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'under_review', 'approved', 'rejected', 'expired')),
    rejection_reason TEXT,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    expires_at TIMESTAMP
);

CREATE INDEX idx_claims_school ON claims(school_id);
CREATE INDEX idx_claims_user ON claims(user_id);
CREATE INDEX idx_claims_status ON claims(status);

-- ============================================
-- ENRICHMENT QUEUE TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS enrichment_queue (
    id SERIAL PRIMARY KEY,
    school_id INT REFERENCES schools(id) ON DELETE CASCADE UNIQUE,
    priority INT DEFAULT 5,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
    attempts INT DEFAULT 0,
    last_attempt TIMESTAMP,
    error_message TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    completed_at TIMESTAMP
);

CREATE INDEX idx_enrichment_queue_status ON enrichment_queue(status);
CREATE INDEX idx_enrichment_queue_priority ON enrichment_queue(priority DESC);

-- ============================================
-- PAGE VIEWS / ANALYTICS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS page_views (
    id SERIAL PRIMARY KEY,
    school_id INT REFERENCES schools(id) ON DELETE CASCADE,
    page_type VARCHAR(50) CHECK (page_type IN ('listing', 'blog')),
    ip_hash VARCHAR(64),
    user_agent TEXT,
    referrer TEXT,
    viewed_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_page_views_school ON page_views(school_id);
CREATE INDEX idx_page_views_date ON page_views(viewed_at);

-- ============================================
-- TRIGGER: Update updated_at timestamp
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_schools_updated_at
    BEFORE UPDATE ON schools
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_claims_updated_at
    BEFORE UPDATE ON claims
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- INITIAL ADMIN USER (change password immediately!)
-- ============================================
-- Password: admin123 (bcrypt hash)
INSERT INTO users (name, email, password_hash, role, email_verified)
VALUES ('Admin', 'admin@nigeriandirectory.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'admin', true)
ON CONFLICT (email) DO NOTHING;
