-- EasyJob Database Schema
-- This script initializes the database with all necessary tables and indexes

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Users Table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(100) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    resume_original TEXT,
    resume_parsed JSONB,
    resume_type VARCHAR(50), -- 'yaml', 'json', 'pdf', 'txt'
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    last_login TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE
);

-- 2. Resume Table
CREATE TABLE resume (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    extension VARCHAR(10) NOT NULL,
    path TEXT NOT NULL,
    short_description TEXT,
    creation_date TIMESTAMP DEFAULT NOW(),
    updated_date TIMESTAMP DEFAULT NOW(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    is_default BOOLEAN DEFAULT FALSE
);

-- Create partial unique index for default resumes only
CREATE UNIQUE INDEX unique_default_resume_per_user 
ON resume (user_id) 
WHERE is_default = true;

-- 3. AI Settings Table
CREATE TABLE ai_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    ai_provider VARCHAR(50) NOT NULL, -- 'ollama', 'openai', 'claude', 'gemini'
    ai_model VARCHAR(100) NOT NULL, -- 'qwen2.5:3b', 'llama2:7b', etc.
    api_key_encrypted TEXT, -- Encrypted API key if needed
    is_default BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, ai_provider, ai_model)
);

-- 4. Companies Table
CREATE TABLE companies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    industry VARCHAR(100),
    size VARCHAR(50), -- 'startup', 'medium', 'large'
    location VARCHAR(255),
    website VARCHAR(255),
    linkedin_url VARCHAR(255),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 5. Jobs Table
CREATE TABLE jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES companies(id),
    title VARCHAR(255) NOT NULL,
    location VARCHAR(255),
    is_remote BOOLEAN DEFAULT FALSE,
    job_type VARCHAR(50), -- 'full-time', 'part-time', 'contract', 'internship'
    platform VARCHAR(50) NOT NULL, -- 'linkedin', 'indeed', 'glassdoor'
    platform_job_id VARCHAR(255), -- External platform's job ID
    job_url TEXT NOT NULL,
    job_description TEXT,
    applicant_count INTEGER DEFAULT 0,
    posted_date TIMESTAMP,
    status VARCHAR(20) DEFAULT 'active', -- 'active', 'closed', 'expired'
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(platform, platform_job_id)
);

-- 6. Applications Table
CREATE TABLE applications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    job_id UUID REFERENCES jobs(id) ON DELETE CASCADE,
    ai_settings_id UUID REFERENCES ai_settings(id),
    resume_id UUID REFERENCES resume(id) ON DELETE RESTRICT,
    status VARCHAR(50) DEFAULT 'applied', -- 'applied', 'reviewed', 'interviewed', 'rejected', 'accepted'
    applied_at TIMESTAMP DEFAULT NOW(),
    response_received_at TIMESTAMP,
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, job_id)
);

-- 7. Questions_Answers Table
CREATE TABLE questions_answers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    application_id UUID REFERENCES applications(id) ON DELETE CASCADE,
    question TEXT NOT NULL,
    answer TEXT NOT NULL,
    question_type VARCHAR(50), -- 'personal_info', 'experience', 'skills', 'notice_period', etc.
    ai_model_used VARCHAR(100), -- Which model answered this
    confidence_score DECIMAL(3,2), -- AI confidence in answer (0.00-1.00)
    is_skipped BOOLEAN DEFAULT FALSE, -- If question was skipped
    created_at TIMESTAMP DEFAULT NOW()
);

-- 8. Application_History Table (For tracking status changes)
CREATE TABLE application_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    application_id UUID REFERENCES applications(id) ON DELETE CASCADE,
    status VARCHAR(50) NOT NULL,
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_active ON users(is_active);

CREATE INDEX idx_ai_settings_user ON ai_settings(user_id);
CREATE INDEX idx_ai_settings_default ON ai_settings(user_id, is_default);

CREATE INDEX idx_companies_name ON companies(name);
CREATE INDEX idx_companies_industry ON companies(industry);

CREATE INDEX idx_jobs_company ON jobs(company_id);
CREATE INDEX idx_jobs_platform ON jobs(platform, platform_job_id);
CREATE INDEX idx_jobs_location ON jobs(location);
CREATE INDEX idx_jobs_remote ON jobs(is_remote);
CREATE INDEX idx_jobs_posted_date ON jobs(posted_date);
CREATE INDEX idx_jobs_status ON jobs(status);
CREATE INDEX idx_jobs_type ON jobs(job_type);

CREATE INDEX idx_applications_user ON applications(user_id);
CREATE INDEX idx_applications_job ON applications(job_id);
CREATE INDEX idx_applications_status ON applications(status);
CREATE INDEX idx_applications_applied_at ON applications(applied_at);

CREATE INDEX idx_qa_application ON questions_answers(application_id);
CREATE INDEX idx_qa_type ON questions_answers(question_type);
CREATE INDEX idx_qa_skipped ON questions_answers(is_skipped);

CREATE INDEX idx_history_application ON application_history(application_id);
CREATE INDEX idx_history_status ON application_history(status);

-- Full-text search for job descriptions and titles
CREATE INDEX idx_jobs_description_fts ON jobs USING gin(to_tsvector('english', job_description));
CREATE INDEX idx_jobs_title_fts ON jobs USING gin(to_tsvector('english', title));

-- Create trigger function for auto-updating timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for all tables with updated_at
CREATE TRIGGER update_users_updated_at 
    BEFORE UPDATE ON users 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ai_settings_updated_at 
    BEFORE UPDATE ON ai_settings 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_companies_updated_at 
    BEFORE UPDATE ON companies 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_jobs_updated_at 
    BEFORE UPDATE ON jobs 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_applications_updated_at 
    BEFORE UPDATE ON applications 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create trigger for application history
CREATE OR REPLACE FUNCTION log_application_status_change()
RETURNS TRIGGER AS $$
BEGIN
    -- Only log if status actually changed
    IF OLD.status IS DISTINCT FROM NEW.status THEN
        INSERT INTO application_history (application_id, status, notes)
        VALUES (NEW.id, NEW.status, 'Status changed from ' || COALESCE(OLD.status, 'NULL') || ' to ' || NEW.status);
    END IF;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER log_application_status_change_trigger
    AFTER UPDATE ON applications
    FOR EACH ROW EXECUTE FUNCTION log_application_status_change();

-- Insert sample data for testing
INSERT INTO companies (name, industry, size, location, website) VALUES 
('Tech Corp', 'Technology', 'large', 'San Francisco, CA', 'https://techcorp.com'),
('StartupXYZ', 'Software', 'startup', 'Berlin, Germany', 'https://startupxyz.com'),
('Global Solutions', 'Consulting', 'medium', 'New York, NY', 'https://globalsolutions.com'),
('AI Innovations', 'Artificial Intelligence', 'medium', 'London, UK', 'https://aiinnovations.co.uk');

-- Create a default test user
INSERT INTO users (username, email, password_hash, resume_type) VALUES 
('testuser', 'test@easyjob.local', '$2b$10$example.hash.for.testing', 'yaml');

-- Create default AI settings for test user
INSERT INTO ai_settings (user_id, ai_provider, ai_model, is_default) 
SELECT id, 'ollama', 'qwen2.5:3b', true FROM users WHERE username = 'testuser';

-- Insert additional AI settings
INSERT INTO ai_settings (user_id, ai_provider, ai_model, is_default) 
SELECT id, 'ollama', 'llama2:7b', false FROM users WHERE username = 'testuser';

-- Insert sample jobs
INSERT INTO jobs (company_id, title, location, is_remote, job_type, platform, platform_job_id, job_url, job_description, applicant_count, posted_date)
SELECT 
    c.id,
    'Software Engineer',
    'San Francisco, CA',
    false,
    'full-time',
    'linkedin',
    'job-123456',
    'https://linkedin.com/jobs/123456',
    'We are looking for a talented Software Engineer to join our team. Experience with React, Node.js, and PostgreSQL required.',
    25,
    NOW() - INTERVAL '2 days'
FROM companies c WHERE c.name = 'Tech Corp';

INSERT INTO jobs (company_id, title, location, is_remote, job_type, platform, platform_job_id, job_url, job_description, applicant_count, posted_date)
SELECT 
    c.id,
    'Frontend Developer',
    'Remote',
    true,
    'full-time',
    'linkedin',
    'job-789012',
    'https://linkedin.com/jobs/789012',
    'Remote Frontend Developer position. Strong skills in React, TypeScript, and modern CSS required.',
    15,
    NOW() - INTERVAL '1 day'
FROM companies c WHERE c.name = 'StartupXYZ';

-- Create sample application
INSERT INTO applications (user_id, job_id, ai_settings_id, status, notes)
SELECT 
    u.id,
    j.id,
    ai.id,
    'applied',
    'Applied through EasyJob extension'
FROM users u, jobs j, ai_settings ai
WHERE u.username = 'testuser' 
  AND j.title = 'Software Engineer'
  AND ai.is_default = true
LIMIT 1;

-- Insert sample questions and answers
INSERT INTO questions_answers (application_id, question, answer, question_type, ai_model_used, confidence_score)
SELECT 
    a.id,
    'What is your email address?',
    'test@easyjob.local',
    'personal_info',
    'qwen2.5:3b',
    1.00
FROM applications a
WHERE a.notes = 'Applied through EasyJob extension'
LIMIT 1;

INSERT INTO questions_answers (application_id, question, answer, question_type, ai_model_used, confidence_score)
SELECT 
    a.id,
    'How many years of experience do you have with React?',
    '5',
    'experience',
    'qwen2.5:3b',
    0.85
FROM applications a
WHERE a.notes = 'Applied through EasyJob extension'
LIMIT 1;

-- Print success message
DO $$
BEGIN
    RAISE NOTICE '✅ EasyJob database initialized successfully!';
    RAISE NOTICE '📊 Database: easyjob_db';
    RAISE NOTICE '👤 User: easyjob_user';
    RAISE NOTICE '🔑 Password: easyjob_password';
    RAISE NOTICE '🌐 pgAdmin: http://localhost:8080';
    RAISE NOTICE '   Email: admin@easyjob.local';
    RAISE NOTICE '   Password: admin123';
END $$; 