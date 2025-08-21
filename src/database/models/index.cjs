// Database Models Index
// Exports all database models for easy importing

const User = require('./User.cjs');
const Resume = require('./Resume.cjs');
const ResumeStructure = require('./ResumeStructure.cjs');
const Company = require('./Company.cjs');
const Job = require('./Job.cjs');
const Application = require('./Application.cjs');
const AISettings = require('./AISettings.cjs');
const QuestionsAnswers = require('./QuestionsAnswers.cjs');
const Filter = require('./Filter.cjs');

module.exports = {
    User,
    Resume,
    ResumeStructure,
    Company,
    Job,
    Application,
    AISettings,
    QuestionsAnswers,
    Filter
}; 