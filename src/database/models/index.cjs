// Database Models Index
// Exports all database models for easy importing

const User = require('./User.cjs');
const Resume = require('./Resume.cjs');
const Company = require('./Company.cjs');
const Job = require('./Job.cjs');
const Application = require('./Application.cjs');
const AISettings = require('./AISettings.cjs');
const QuestionsAnswers = require('./QuestionsAnswers.cjs');

module.exports = {
    User,
    Resume,
    Company,
    Job,
    Application,
    AISettings,
    QuestionsAnswers
}; 