const Application = require('./models/Application.cjs');

class ApplicationService {
    
    // Create a new application
    static async createApplication(applicationData) {
        try {
            const application = await Application.create(applicationData);
            return application.toJSON();
        } catch (error) {
            throw new Error(`Failed to create application: ${error.message}`);
        }
    }

    // Get application by ID
    static async getApplicationById(id) {
        try {
            const application = await Application.findById(id);
            return application ? application.toJSON() : null;
        } catch (error) {
            throw new Error(`Failed to get application by ID: ${error.message}`);
        }
    }

    // Get all applications for a user
    static async getApplicationsByUserId(userId) {
        try {
            const applications = await Application.findByUserId(userId);
            return applications.map(app => app.toJSON());
        } catch (error) {
            throw new Error(`Failed to get applications by user ID: ${error.message}`);
        }
    }

    // Get application by user and job
    static async getApplicationByUserAndJob(userId, jobId) {
        try {
            const application = await Application.findByUserAndJob(userId, jobId);
            return application ? application.toJSON() : null;
        } catch (error) {
            throw new Error(`Failed to get application by user and job: ${error.message}`);
        }
    }

    // Get applications by status
    static async getApplicationsByStatus(status, userId = null) {
        try {
            const applications = await Application.findByStatus(status, userId);
            return applications.map(app => app.toJSON());
        } catch (error) {
            throw new Error(`Failed to get applications by status: ${error.message}`);
        }
    }

    // Get recent applications
    static async getRecentApplications(limit = 10, userId = null) {
        try {
            const applications = await Application.getRecent(limit, userId);
            return applications.map(app => app.toJSON());
        } catch (error) {
            throw new Error(`Failed to get recent applications: ${error.message}`);
        }
    }

    // Update application status
    static async updateApplicationStatus(id, status, notes = null) {
        try {
            const application = await Application.findById(id);
            if (!application) {
                throw new Error('Application not found');
            }
            
            await application.updateStatus(status, notes);
            return application.toJSON();
        } catch (error) {
            throw new Error(`Failed to update application status: ${error.message}`);
        }
    }

    // Mark response received
    static async markResponseReceived(id) {
        try {
            const application = await Application.findById(id);
            if (!application) {
                throw new Error('Application not found');
            }
            
            await application.markResponseReceived();
            return application.toJSON();
        } catch (error) {
            throw new Error(`Failed to mark response received: ${error.message}`);
        }
    }

    // Get application with full details
    static async getApplicationWithDetails(id) {
        try {
            const application = await Application.findById(id);
            if (!application) {
                throw new Error('Application not found');
            }
            
            const details = await application.getWithDetails();
            return details;
        } catch (error) {
            throw new Error(`Failed to get application details: ${error.message}`);
        }
    }

    // Get questions and answers for an application
    static async getApplicationQuestionsAnswers(id) {
        try {
            const application = await Application.findById(id);
            if (!application) {
                throw new Error('Application not found');
            }
            
            const questionsAnswers = await application.getQuestionsAnswers();
            return questionsAnswers;
        } catch (error) {
            throw new Error(`Failed to get application questions and answers: ${error.message}`);
        }
    }

    // Add question and answer to an application
    static async addQuestionAnswer(id, questionData) {
        try {
            const application = await Application.findById(id);
            if (!application) {
                throw new Error('Application not found');
            }
            
            const questionAnswer = await application.addQuestionAnswer(questionData);
            return questionAnswer;
        } catch (error) {
            throw new Error(`Failed to add question and answer: ${error.message}`);
        }
    }

    // Get the resume used for an application
    static async getApplicationResume(id) {
        try {
            const application = await Application.findById(id);
            if (!application) {
                throw new Error('Application not found');
            }
            
            const resume = await application.getResume();
            return resume;
        } catch (error) {
            throw new Error(`Failed to get application resume: ${error.message}`);
        }
    }

    // Get application statistics
    static async getApplicationStats(userId = null) {
        try {
            const stats = await Application.getStats(userId);
            return {
                total_applications: parseInt(stats.total_applications) || 0,
                pending: parseInt(stats.pending) || 0,
                reviewed: parseInt(stats.reviewed) || 0,
                interviewed: parseInt(stats.interviewed) || 0,
                rejected: parseInt(stats.rejected) || 0,
                accepted: parseInt(stats.accepted) || 0,
                responses_received: parseInt(stats.responses_received) || 0,
                avg_response_time_days: parseFloat(stats.avg_response_time_days) || 0
            };
        } catch (error) {
            throw new Error(`Failed to get application statistics: ${error.message}`);
        }
    }

    // Delete an application
    static async deleteApplication(id) {
        try {
            const application = await Application.findById(id);
            if (!application) {
                throw new Error('Application not found');
            }
            
            await application.delete();
            return true;
        } catch (error) {
            throw new Error(`Failed to delete application: ${error.message}`);
        }
    }

    // Check if application exists
    static async applicationExists(id) {
        try {
            const application = await Application.findById(id);
            return application !== null;
        } catch (error) {
            throw new Error(`Failed to check if application exists: ${error.message}`);
        }
    }

    // Get applications that used a specific resume
    static async getResumeApplications(resumeId) {
        try {
            const Application = require('./models/Application.cjs');
            const { pool } = require('./connection.cjs');
            
            const query = `
                SELECT a.*, j.title as job_title, c.name as company_name, j.location, j.is_remote
                FROM applications a
                JOIN jobs j ON a.job_id = j.id
                JOIN companies c ON j.company_id = c.id
                WHERE a.resume_id = $1
                ORDER BY a.applied_at DESC
            `;
            
            const result = await pool.query(query, [resumeId]);
            return result.rows.map(row => new Application(row).toJSON());
        } catch (error) {
            throw new Error(`Failed to get resume applications: ${error.message}`);
        }
    }

    // Get applications that used specific AI settings
    static async getAISettingsApplications(settingsId) {
        try {
            const Application = require('./models/Application.cjs');
            const { pool } = require('./connection.cjs');
            
            const query = `
                SELECT a.*, j.title as job_title, c.name as company_name, j.location, j.is_remote
                FROM applications a
                JOIN jobs j ON a.job_id = j.id
                JOIN companies c ON j.company_id = c.id
                WHERE a.ai_settings_id = $1
                ORDER BY a.applied_at DESC
            `;
            
            const result = await pool.query(query, [settingsId]);
            return result.rows.map(row => new Application(row).toJSON());
        } catch (error) {
            throw new Error(`Failed to get AI settings applications: ${error.message}`);
        }
    }


}

module.exports = ApplicationService; 