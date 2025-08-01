const { pool } = require('../connection.cjs');

class Application {
    constructor(applicationData) {
        this.id = applicationData.id;
        this.user_id = applicationData.user_id;
        this.job_id = applicationData.job_id;
        this.ai_settings_id = applicationData.ai_settings_id;
        this.resume_id = applicationData.resume_id;
        this.status = applicationData.status;
        this.applied_at = applicationData.applied_at;
        this.response_received_at = applicationData.response_received_at;
        this.notes = applicationData.notes;
        this.created_at = applicationData.created_at;
        this.updated_at = applicationData.updated_at;
        
        // Set joined fields if they exist (from JOIN queries)
        if (applicationData.job_title) this.job_title = applicationData.job_title;
        if (applicationData.company_name) this.company_name = applicationData.company_name;
        if (applicationData.location) this.location = applicationData.location;
        if (applicationData.is_remote !== undefined) this.is_remote = applicationData.is_remote;
        if (applicationData.job_location) this.job_location = applicationData.job_location;
        if (applicationData.job_type) this.job_type = applicationData.job_type;
        if (applicationData.job_url) this.job_url = applicationData.job_url;
        if (applicationData.platform) this.platform = applicationData.platform;
        if (applicationData.industry) this.industry = applicationData.industry;
        if (applicationData.company_website) this.company_website = applicationData.company_website;
        if (applicationData.ai_provider) this.ai_provider = applicationData.ai_provider;
        if (applicationData.ai_model) this.ai_model = applicationData.ai_model;
        if (applicationData.resume_name) this.resume_name = applicationData.resume_name;
        if (applicationData.resume_extension) this.resume_extension = applicationData.resume_extension;
        if (applicationData.resume_path) this.resume_path = applicationData.resume_path;
    }

    // Create a new application
    static async create(applicationData) {
        const query = `
            INSERT INTO applications (user_id, job_id, ai_settings_id, resume_id, status, notes)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING *
        `;
        const values = [
            applicationData.user_id,
            applicationData.job_id,
            applicationData.ai_settings_id,
            applicationData.resume_id,
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
                ai.ai_model,
                r.name as resume_name,
                r.extension as resume_extension,
                r.path as resume_path
            FROM applications a
            JOIN jobs j ON a.job_id = j.id
            JOIN companies c ON j.company_id = c.id
            JOIN resume r ON a.resume_id = r.id
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

    // Get the resume used for this application
    async getResume() {
        const query = 'SELECT * FROM resume WHERE id = $1';
        try {
            const result = await pool.query(query, [this.resume_id]);
            return result.rows[0] || null;
        } catch (error) {
            throw new Error(`Failed to get application resume: ${error.message}`);
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

    // Convert to JSON for API responses
    toJSON() {
        return {
            id: this.id,
            user_id: this.user_id,
            job_id: this.job_id,
            ai_settings_id: this.ai_settings_id,
            resume_id: this.resume_id,
            status: this.status,
            applied_at: this.applied_at,
            response_received_at: this.response_received_at,
            notes: this.notes,
            created_at: this.created_at,
            updated_at: this.updated_at,
            // Include additional fields if they exist (from joins)
            ...(this.job_title && { job_title: this.job_title }),
            ...(this.company_name && { company_name: this.company_name }),
            ...(this.location && { location: this.location }),
            ...(this.job_location && { job_location: this.job_location }),
            ...(this.is_remote !== undefined && { is_remote: this.is_remote }),
            ...(this.job_type && { job_type: this.job_type }),
            ...(this.job_url && { job_url: this.job_url }),
            ...(this.platform && { platform: this.platform }),
            ...(this.industry && { industry: this.industry }),
            ...(this.company_website && { company_website: this.company_website }),
            ...(this.ai_provider && { ai_provider: this.ai_provider }),
            ...(this.ai_model && { ai_model: this.ai_model }),
            ...(this.resume_name && { resume_name: this.resume_name }),
            ...(this.resume_extension && { resume_extension: this.resume_extension }),
            ...(this.resume_path && { resume_path: this.resume_path })
        };
    }
}

module.exports = Application; 