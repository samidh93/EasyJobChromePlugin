-- EasyJob Test Data Cleanup Script (Targeted)
-- This script removes the specific test data entries while preserving real applications

-- Display current data counts before cleanup
SELECT 'Current data counts:' as status;
SELECT 'Users: ' || COUNT(*) FROM users;
SELECT 'Companies: ' || COUNT(*) FROM companies;
SELECT 'Jobs: ' || COUNT(*) FROM jobs;
SELECT 'Applications: ' || COUNT(*) FROM applications;
SELECT 'Questions/Answers: ' || COUNT(*) FROM questions_answers;

-- Start cleanup of specific test data (order matters due to foreign key constraints)
\echo 'Starting targeted test data cleanup...'

-- 1. Delete questions_answers for test applications (applications to test companies)
DELETE FROM questions_answers 
WHERE application_id IN (
    SELECT a.id FROM applications a 
    JOIN jobs j ON a.job_id = j.id
    JOIN companies c ON j.company_id = c.id
    WHERE c.name IN ('Google', 'Microsoft', 'Apple', 'Meta', 'Netflix')
);
\echo 'Deleted test questions_answers'

-- 2. Delete test applications (applications to test companies)
DELETE FROM applications 
WHERE job_id IN (
    SELECT j.id FROM jobs j 
    JOIN companies c ON j.company_id = c.id
    WHERE c.name IN ('Google', 'Microsoft', 'Apple', 'Meta', 'Netflix')
);
\echo 'Deleted test applications'

-- 3. Delete test jobs (jobs from test companies)
DELETE FROM jobs 
WHERE company_id IN (
    SELECT id FROM companies 
    WHERE name IN ('Google', 'Microsoft', 'Apple', 'Meta', 'Netflix')
);
\echo 'Deleted test jobs'

-- 4. Delete test companies
DELETE FROM companies 
WHERE name IN ('Google', 'Microsoft', 'Apple', 'Meta', 'Netflix');
\echo 'Deleted test companies'

-- Display final counts
\echo 'Test data cleanup complete! Final data counts:'
SELECT 'Users: ' || COUNT(*) FROM users;
SELECT 'Companies: ' || COUNT(*) FROM companies;
SELECT 'Jobs: ' || COUNT(*) FROM jobs;
SELECT 'Applications: ' || COUNT(*) FROM applications;
SELECT 'Questions/Answers: ' || COUNT(*) FROM questions_answers;

-- Show remaining real data
\echo 'Remaining companies (your real data):'
SELECT name, location FROM companies ORDER BY created_at;

\echo 'Targeted test data cleanup completed successfully!'
\echo 'Removed: Google, Microsoft, Apple, Meta, Netflix and their associated jobs/applications'
\echo 'Preserved: Your real applications to German companies (Contiva GmbH, Getronics, EXECURATER GmbH)' 