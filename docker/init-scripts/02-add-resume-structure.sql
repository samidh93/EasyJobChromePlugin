-- Migration: Add resume_structure table
-- This script adds the resume_structure table for storing structured resume data

-- 2.1. Resume Structure Table
CREATE TABLE IF NOT EXISTS resume_structure (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    resume_id UUID REFERENCES resume(id) ON DELETE CASCADE,
    personal_info JSONB NOT NULL DEFAULT '{}',
    summary JSONB NOT NULL DEFAULT '{}',
    experiences JSONB NOT NULL DEFAULT '[]',
    educations JSONB NOT NULL DEFAULT '[]',
    skills JSONB NOT NULL DEFAULT '{}',
    languages JSONB NOT NULL DEFAULT '[]',
    projects JSONB NOT NULL DEFAULT '[]',
    certifications JSONB NOT NULL DEFAULT '[]',
    interests JSONB NOT NULL DEFAULT '[]',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(resume_id)
);

-- Create indexes for resume_structure table
CREATE INDEX IF NOT EXISTS idx_resume_structure_resume_id ON resume_structure(resume_id);
CREATE INDEX IF NOT EXISTS idx_resume_structure_skills ON resume_structure USING gin(skills);
CREATE INDEX IF NOT EXISTS idx_resume_structure_experiences ON resume_structure USING gin(experiences);

-- Create trigger for auto-updating timestamps
CREATE TRIGGER update_resume_structure_updated_at 
    BEFORE UPDATE ON resume_structure 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert sample resume structure data for test user
INSERT INTO resume_structure (resume_id, personal_info, summary, experiences, educations, skills, languages, projects, certifications, interests)
SELECT 
    r.id,
    '{"name": "Sami Dhiab", "email": "sami.dhiab.x@gmail.com", "phone": "+49 17666994604", "location": "Berlin, Germany", "citizenship": "German/Tunisian"}'::jsonb,
    '{"text": "Senior System Engineer with a strong background in designing, deploying, and maintaining modern application platforms in complex IT environments. Experienced in working across the full software development lifecycle, from conceptual design and development to testing. Skilled in building reliable, scalable systems on both on-premise and cloud infrastructures, with a focus on automation, performance, and availability."}'::jsonb,
    '[
        {
            "title": "Professional System Engineer",
            "company": "Expleo Group",
            "location": "Berlin, Germany",
            "duration": "November 2023 - Present",
            "responsibilities": [
                "Appointed as Infrastructure and Tooling Manager in a large-scale project with Volkswagen",
                "Designed and implemented CI/CD pipelines and automated key processes",
                "Collaborated closely with development, QA, and infrastructure teams"
            ],
            "skills_acquired": ["System Architecture & Integration", "Infrastructure & DevOps Automation", "Cross-Team Collaboration"]
        },
        {
            "title": "Principal Software Engineer",
            "company": "Theion",
            "location": "Berlin, Germany",
            "duration": "June 2021 - November 2023",
            "responsibilities": [
                "Led the full software development lifecycle of an in-house desktop application and a web application",
                "Managed communication between distributed systems and ensured seamless integration",
                "Collaborated with engineers and scientists to gather requirements"
            ],
            "skills_acquired": ["Desktop Application Development", "Distributed Systems Communication", "Requirements Engineering"]
        }
    ]'::jsonb,
    '[
        {
            "degree": "Master of Engineering",
            "field": "Mechatronics, Robotics, and Automation",
            "institution": "Beuth University of Applied Sciences Berlin",
            "graduation_year": "2019"
        },
        {
            "degree": "Bachelor of Engineering",
            "field": "Mechatronics, Robotics, and Automation",
            "institution": "Institut Supérieur des Etudes Technologiques de Mahdia",
            "graduation_year": "2015"
        }
    ]'::jsonb,
    '{
        "Programming Languages": {
            "Python": {"level": "Advanced", "years_experience": 8},
            "Java": {"level": "Intermediate", "years_experience": 5},
            "JavaScript": {"level": "Intermediate", "years_experience": 5},
            "C/C++": {"level": "Advanced", "years_experience": 8}
        },
        "Cloud Services": {
            "AWS": {"level": "Advanced", "years_experience": 6},
            "Azure": {"level": "Intermediate", "years_experience": 4},
            "GCP": {"level": "Beginner", "years_experience": 2}
        },
        "Frameworks": {
            "Django": {"level": "Advanced", "years_experience": 6},
            "Flask": {"level": "Intermediate", "years_experience": 4},
            "Spring": {"level": "Intermediate", "years_experience": 4},
            "Qt": {"level": "Intermediate", "years_experience": 5},
            "ROS": {"level": "Advanced", "years_experience": 7}
        },
        "Tools": {
            "Docker": {"level": "Advanced", "years_experience": 6},
            "Git": {"level": "Advanced", "years_experience": 8},
            "Jira": {"level": "Advanced", "years_experience": 6},
            "Jenkins": {"level": "Advanced", "years_experience": 5},
            "Terraform": {"level": "Intermediate", "years_experience": 3},
            "Ansible": {"level": "Intermediate", "years_experience": 3},
            "Kubernetes": {"level": "Intermediate", "years_experience": 3}
        }
    }'::jsonb,
    '[
        {"language": "French", "level": "Professional"},
        {"language": "Arabic", "level": "Native"},
        {"language": "German", "level": "Professional"},
        {"language": "English", "level": "Professional"},
        {"language": "Spanish", "level": "Elementary"}
    ]'::jsonb,
    '[
        {
            "name": "AI Resume Creator",
            "role": "Developer",
            "description": "An intelligent resume generator that tailors your resume based on job descriptions using AI",
            "skills": ["Python", "LLMs APIs", "Ollamas", "langchain"]
        },
        {
            "name": "Easy Apply Hub Job Platform",
            "role": "Developer",
            "description": "All in one job application platform for job seekers and employers",
            "skills": ["Python", "Django", "Selenium", "AWS", "JavaScript"]
        }
    ]'::jsonb,
    '[
        {
            "name": "AWS Certified Solutions Architect Associate",
            "issuer": "Amazon Web Services",
            "date": "2024"
        },
        {
            "name": "AWS Practitioner",
            "issuer": "Amazon Web Services",
            "date": "2023"
        },
        {
            "name": "EXIN Agile Scrum Foundation (ASF)",
            "issuer": "EXIN",
            "date": "2023"
        }
    ]'::jsonb,
    '["System Architecture", "Autonomous Systems", "Sustainable Technologies", "Artificial Intelligence", "Open Source Development", "Cloud Architecture", "DevOps"]'::jsonb
FROM resume r
JOIN users u ON r.user_id = u.id
WHERE u.username = 'testuser' AND r.is_default = true
ON CONFLICT (resume_id) DO NOTHING;

-- Print success message
DO $$
BEGIN
    RAISE NOTICE '✅ Resume structure table added successfully!';
    RAISE NOTICE '📊 Table: resume_structure';
    RAISE NOTICE '🔗 Linked to: resume table';
    RAISE NOTICE '📝 Sample data inserted for test user';
END $$; 