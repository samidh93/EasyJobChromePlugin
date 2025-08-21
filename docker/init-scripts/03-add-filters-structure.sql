-- Migration: Add filters table
-- This script adds the filters table for storing job filtering rules

-- 3.1. Filters Table
CREATE TABLE IF NOT EXISTS filters (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    type VARCHAR(50) NOT NULL CHECK (type IN ('job_title', 'company_name', 'job_description')),
    keywords JSONB NOT NULL,
    action VARCHAR(20) NOT NULL CHECK (action IN ('allow', 'block')),
    match_type VARCHAR(20) NOT NULL CHECK (match_type IN ('contains', 'not_contains')),
    is_active BOOLEAN DEFAULT TRUE,
    priority INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for filters table
CREATE INDEX IF NOT EXISTS idx_filters_user_id ON filters(user_id);
CREATE INDEX IF NOT EXISTS idx_filters_type ON filters(type);
CREATE INDEX IF NOT EXISTS idx_filters_is_active ON filters(is_active);
CREATE INDEX IF NOT EXISTS idx_filters_priority ON filters(priority);
CREATE INDEX IF NOT EXISTS idx_filters_keywords ON filters USING gin(keywords);

-- Create trigger for auto-updating timestamps
CREATE TRIGGER update_filters_updated_at 
    BEFORE UPDATE ON filters 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert sample filter data for testing
INSERT INTO filters (user_id, name, description, type, keywords, action, match_type, is_active, priority)
SELECT 
    u.id,
    'Frontend Developer',
    'Allow frontend development roles',
    'job_title',
    '["frontend", "front-end", "react", "vue", "angular"]'::jsonb,
    'allow',
    'contains',
    true,
    1
FROM users u 
WHERE u.username = 'testuser' 
LIMIT 1;

INSERT INTO filters (user_id, name, description, type, keywords, action, match_type, is_active, priority)
SELECT 
    u.id,
    'Block Consulting Companies',
    'Block consulting and agency companies',
    'company_name',
    '["consulting", "agency", "outsourcing"]'::jsonb,
    'block',
    'contains',
    true,
    2
FROM users u 
WHERE u.username = 'testuser' 
LIMIT 1;

INSERT INTO filters (user_id, name, description, type, keywords, action, match_type, is_active, priority)
SELECT 
    u.id,
    'Remote Work Preferred',
    'Prefer remote work opportunities',
    'job_description',
    '["remote", "work from home", "telecommute"]'::jsonb,
    'allow',
    'contains',
    true,
    3
FROM users u 
WHERE u.username = 'testuser' 
LIMIT 1;
