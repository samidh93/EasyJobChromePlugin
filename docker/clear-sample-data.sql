-- EasyJob Test/Sample Data Cleanup Script
-- This script removes only the test/sample data inserted during database initialization
-- while preserving any real data you may have added

-- Display current data counts before cleanup
SELECT 'Current data counts:' as status;
SELECT 'Users: ' || COUNT(*) FROM users;
SELECT 'Companies: ' || COUNT(*) FROM companies;
SELECT 'Jobs: ' || COUNT(*) FROM jobs;
SELECT 'Applications: ' || COUNT(*) FROM applications;
SELECT 'Questions/Answers: ' || COUNT(*) FROM questions_answers;
SELECT 'AI Settings: ' || COUNT(*) FROM ai_settings;
SELECT 'Resume: ' || COUNT(*) FROM resume;

-- Start cleanup of specific test data (order matters due to foreign key constraints)
\echo 'Starting test/sample data cleanup...'

-- 1. Delete questions_answers for test applications
DELETE FROM questions_answers 
WHERE application_id IN (
    SELECT a.id FROM applications a 
    JOIN users u ON a.user_id = u.id 
    WHERE u.username = 'testuser'
);
\echo 'Deleted test questions_answers'

-- 2. Delete test applications (for testuser)
DELETE FROM applications 
WHERE user_id IN (SELECT id FROM users WHERE username = 'testuser');
\echo 'Deleted test applications'

-- 3. Delete sample jobs (based on platform_job_id patterns and sample companies)
DELETE FROM jobs 
WHERE platform_job_id IN ('job-123456', 'job-789012')
   OR company_id IN (
       SELECT id FROM companies 
       WHERE name IN ('Tech Corp', 'StartupXYZ', 'Global Solutions', 'AI Innovations')
   );
\echo 'Deleted sample jobs'

-- 4. Delete AI settings for test user
DELETE FROM ai_settings 
WHERE user_id IN (SELECT id FROM users WHERE username = 'testuser');
\echo 'Deleted test AI settings'

-- 5. Delete resume for test user (none were created in sample data, but just in case)
DELETE FROM resume 
WHERE user_id IN (SELECT id FROM users WHERE username = 'testuser');
\echo 'Deleted test resumes'

-- 6. Delete sample companies
DELETE FROM companies 
WHERE name IN ('Tech Corp', 'StartupXYZ', 'Global Solutions', 'AI Innovations');
\echo 'Deleted sample companies'

-- 7. Delete test user
DELETE FROM users 
WHERE username = 'testuser' OR email = 'test@easyjob.local';
\echo 'Deleted test user'

-- Display final counts
\echo 'Test data cleanup complete! Final data counts:'
SELECT 'Users: ' || COUNT(*) FROM users;
SELECT 'Companies: ' || COUNT(*) FROM companies;
SELECT 'Jobs: ' || COUNT(*) FROM jobs;
SELECT 'Applications: ' || COUNT(*) FROM applications;
SELECT 'Questions/Answers: ' || COUNT(*) FROM questions_answers;
SELECT 'AI Settings: ' || COUNT(*) FROM ai_settings;
SELECT 'Resume: ' || COUNT(*) FROM resume;

\echo 'Test/sample data cleanup completed successfully!'
\echo 'Only test data removed - any real data you added has been preserved.' 