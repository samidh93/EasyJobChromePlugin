const { pool } = require('../connection.cjs');

class Application {
    constructor(applicationData) {
        this.id = applicationData.id;
        this.user_id = applicationData.user_id;
        this.job_id = applicationData.job_id;
        this.ai_settings_id = applicationData.ai_settings_id;
        this.status = applicationData.status;
        this.applied_at = applicationData.applied_at;
        this.response_received_at = applicationData.response_received_at;
        this.notes = applicationData.notes;
        this.created_at = applicationData.created_at;
        this.updated_at = applicationData.updated_at;
    }

    // Create a new application
    static async create(applicationData) {
        const query = `
            INSERT INTO applications (user_id, job_id, ai_settings_id, status, notes)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING *
        `;
        const values = [
            applicationData.user_id,
            applicationData.job_id,
            applicationData.ai_settings_id,
            applicationData.status || 'applied',
            applicationData.notes
        ];

        try {
            const result = await pool.query(query, values);
            return new Application(result.rows[0]);
        } catch (error) {
            throw new Error(`Failed to create application: ${error.message}`);
        }
    }

    // Find application by ID
    static async findById(id) {
        const query = 'SELECT * FROM applications WHERE id = $1';
        try {
            const result = await pool.query(query, [id]);
            return result.rows[0] ? new Application(result.rows[0]) : null;
        } catch (error) {
            throw new Error(`Failed to find application by ID: ${error.message}`);
        }
    }

    // Find applications by user ID
    static async findByUserId(userId) {
        const query = `
            SELECT a.*, j.title as job_title, c.name as company_name, j.location, j.is_remote
            FROM applications a
            JOIN jobs j ON a.job_id = j.id
            JOIN companies c ON j.company_id = c.id
            WHERE a.user_id = $1
            ORDER BY a.applied_at DESC
        `;
        try {
            const result = await pool.query(query, [userId]);
            return result.rows.map(row => new Application(row));
        } catch (error) {
            throw new Error(`Failed to find applications by user ID: ${error.message}`);
        }
    }

    // Find application by user and job
    static async findByUserAndJob(userId, jobId) {
        const query = 'SELECT * FROM applications WHERE user_id = $1 AND job_id = $2';
        try {
            const result = await pool.query(query, [userId, jobId]);
            return result.rows[0] ? new Application(result.rows[0]) : null;
        } catch (error) {
            throw new Error(`Failed to find application by user and job: ${error.message}`);
        }
    }

    // Update application status
    async updateStatus(newStatus, notes = null) {
        const query = `
            UPDATE applications 
            SET status = $1, notes = COALESCE($2, notes)
            WHERE id = $3
            RETURNING *
        `;
        try {
            const result = await pool.query(query, [newStatus, notes, this.id]);
            const updatedApp = new Application(result.rows[0]);
            Object.assign(this, updatedApp);
            return this;
        } catch (error) {
            throw new Error(`Failed to update application status: ${error.message}`);
        }
    }

    // Update response received date
    async markResponseReceived() {
        const query = `
            UPDATE applications 
            SET response_received_at = NOW()
            WHERE id = $1
            RETURNING response_received_at
        `;
        try {
            const result = await pool.query(query, [this.id]);
            this.response_received_at = result.rows[0].response_received_at;
            return this;
        } catch (error) {
            throw new Error(`Failed to mark response received: ${error.message}`);
        }
    }

    // Get application with job and company details
    async getWithDetails() {
        const query = `
            SELECT 
                a.*,
                j.title as job_title,
                j.location as job_location,
                j.is_remote,
                j.job_type,
                j.job_url,
                j.platform,
                c.name as company_name,
                c.industry,
                c.website as company_website,
                ai.ai_provider,
                ai.ai_model
            FROM applications a
            JOIN jobs j ON a.job_id = j.id
            JOIN companies c ON j.company_id = c.id
            LEFT JOIN ai_settings ai ON a.ai_settings_id = ai.id
            WHERE a.id = $1
        `;
        try {
            const result = await pool.query(query, [this.id]);
            return result.rows[0] || null;
        } catch (error) {
            throw new Error(`Failed to get application details: ${error.message}`);
        }
    }

    // Get questions and answers for this application
    async getQuestionsAnswers() {
        const query = `
            SELECT * FROM questions_answers 
            WHERE application_id = $1 
            ORDER BY created_at ASC
        `;
        try {
            const result = await pool.query(query, [this.id]);
            return result.rows;
        } catch (error) {
            throw new Error(`Failed to get questions and answers: ${error.message}`);
        }
    }

    // Add question and answer
    async addQuestionAnswer(questionData) {
        const query = `
            INSERT INTO questions_answers (
                application_id, question, answer, question_type, 
                ai_model_used, confidence_score, is_skipped
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING *
        `;
        const values = [
            this.id,
            questionData.question,
            questionData.answer,
            questionData.question_type,
            questionData.ai_model_used,
            questionData.confidence_score,
            questionData.is_skipped || false
        ];

        try {
            const result = await pool.query(query, values);
            return result.rows[0];
        } catch (error) {
            throw new Error(`Failed to add question answer: ${error.message}`);
        }
    }

    // Get application history
    async getHistory() {
        const query = `
            SELECT * FROM application_history 
            WHERE application_id = $1 
            ORDER BY created_at DESC
        `;
        try {
            const result = await pool.query(query, [this.id]);
            return result.rows;
        } catch (error) {
            throw new Error(`Failed to get application history: ${error.message}`);
        }
    }

    // Get applications by status
    static async findByStatus(status, userId = null) {
        let query = `
            SELECT a.*, j.title as job_title, c.name as company_name
            FROM applications a
            JOIN jobs j ON a.job_id = j.id
            JOIN companies c ON j.company_id = c.id
            WHERE a.status = $1
        `;
        const values = [status];

        if (userId) {
            query += ' AND a.user_id = $2';
            values.push(userId);
        }

        query += ' ORDER BY a.applied_at DESC';

        try {
            const result = await pool.query(query, values);
            return result.rows.map(row => new Application(row));
        } catch (error) {
            throw new Error(`Failed to find applications by status: ${error.message}`);
        }
    }

    // Get recent applications
    static async getRecent(limit = 10, userId = null) {
        let query = `
            SELECT a.*, j.title as job_title, c.name as company_name
            FROM applications a
            JOIN jobs j ON a.job_id = j.id
            JOIN companies c ON j.company_id = c.id
        `;
        const values = [];

        if (userId) {
            query += ' WHERE a.user_id = $1';
            values.push(userId);
        }

        query += ' ORDER BY a.applied_at DESC LIMIT $' + (values.length + 1);
        values.push(limit);

        try {
            const result = await pool.query(query, values);
            return result.rows.map(row => new Application(row));
        } catch (error) {
            throw new Error(`Failed to get recent applications: ${error.message}`);
        }
    }

    // Get application statistics
    static async getStats(userId = null) {
        let query = `
            SELECT 
                COUNT(*) as total_applications,
                COUNT(CASE WHEN status = 'applied' THEN 1 END) as pending,
                COUNT(CASE WHEN status = 'reviewed' THEN 1 END) as reviewed,
                COUNT(CASE WHEN status = 'interviewed' THEN 1 END) as interviewed,
                COUNT(CASE WHEN status = 'rejected' THEN 1 END) as rejected,
                COUNT(CASE WHEN status = 'accepted' THEN 1 END) as accepted,
                COUNT(CASE WHEN response_received_at IS NOT NULL THEN 1 END) as responses_received,
                AVG(CASE WHEN response_received_at IS NOT NULL 
                    THEN EXTRACT(EPOCH FROM (response_received_at - applied_at))/86400 
                    END) as avg_response_time_days
            FROM applications
        `;
        const values = [];

        if (userId) {
            query += ' WHERE user_id = $1';
            values.push(userId);
        }

        try {
            const result = await pool.query(query, values);
            return result.rows[0];
        } catch (error) {
            throw new Error(`Failed to get application stats: ${error.message}`);
        }
    }

    // Delete application and related data
    async delete() {
        const query = 'DELETE FROM applications WHERE id = $1';
        try {
            await pool.query(query, [this.id]);
            return true;
        } catch (error) {
            throw new Error(`Failed to delete application: ${error.message}`);
        }
    }
}

module.exports = Application; 