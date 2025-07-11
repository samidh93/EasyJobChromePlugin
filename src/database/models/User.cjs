const { pool } = require('../connection.cjs');

class User {
    constructor(userData) {
        this.id = userData.id;
        this.username = userData.username;
        this.email = userData.email;
        this.password_hash = userData.password_hash;
        this.resume_original = userData.resume_original;
        this.resume_parsed = userData.resume_parsed;
        this.resume_type = userData.resume_type;
        this.created_at = userData.created_at;
        this.updated_at = userData.updated_at;
        this.last_login = userData.last_login;
        this.is_active = userData.is_active;
    }

    // Create a new user
    static async create(userData) {
        const query = `
            INSERT INTO users (username, email, password_hash, resume_original, resume_parsed, resume_type)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING *
        `;
        const values = [
            userData.username,
            userData.email,
            userData.password_hash,
            userData.resume_original,
            userData.resume_parsed,
            userData.resume_type
        ];

        try {
            const result = await pool.query(query, values);
            return new User(result.rows[0]);
        } catch (error) {
            throw new Error(`Failed to create user: ${error.message}`);
        }
    }

    // Find user by ID
    static async findById(id) {
        const query = 'SELECT * FROM users WHERE id = $1';
        try {
            const result = await pool.query(query, [id]);
            return result.rows[0] ? new User(result.rows[0]) : null;
        } catch (error) {
            throw new Error(`Failed to find user by ID: ${error.message}`);
        }
    }

    // Find user by email
    static async findByEmail(email) {
        const query = 'SELECT * FROM users WHERE email = $1';
        try {
            const result = await pool.query(query, [email]);
            return result.rows[0] ? new User(result.rows[0]) : null;
        } catch (error) {
            throw new Error(`Failed to find user by email: ${error.message}`);
        }
    }

    // Find user by username
    static async findByUsername(username) {
        const query = 'SELECT * FROM users WHERE username = $1';
        try {
            const result = await pool.query(query, [username]);
            return result.rows[0] ? new User(result.rows[0]) : null;
        } catch (error) {
            throw new Error(`Failed to find user by username: ${error.message}`);
        }
    }

    // Update user data
    async update(updateData) {
        const fields = [];
        const values = [];
        let paramCount = 1;

        // Build dynamic update query
        for (const [key, value] of Object.entries(updateData)) {
            if (key !== 'id' && value !== undefined) {
                fields.push(`${key} = $${paramCount}`);
                values.push(value);
                paramCount++;
            }
        }

        if (fields.length === 0) {
            throw new Error('No fields to update');
        }

        const query = `
            UPDATE users 
            SET ${fields.join(', ')} 
            WHERE id = $${paramCount}
            RETURNING *
        `;
        values.push(this.id);

        try {
            const result = await pool.query(query, values);
            const updatedUser = new User(result.rows[0]);
            Object.assign(this, updatedUser);
            return this;
        } catch (error) {
            throw new Error(`Failed to update user: ${error.message}`);
        }
    }

    // Update last login
    async updateLastLogin() {
        const query = 'UPDATE users SET last_login = NOW() WHERE id = $1 RETURNING last_login';
        try {
            const result = await pool.query(query, [this.id]);
            this.last_login = result.rows[0].last_login;
            return this;
        } catch (error) {
            throw new Error(`Failed to update last login: ${error.message}`);
        }
    }

    // Update resume data
    async updateResume(resumeData) {
        const query = `
            UPDATE users 
            SET resume_original = $1, resume_parsed = $2, resume_type = $3
            WHERE id = $4
            RETURNING *
        `;
        const values = [
            resumeData.original,
            resumeData.parsed,
            resumeData.type,
            this.id
        ];

        try {
            const result = await pool.query(query, values);
            const updatedUser = new User(result.rows[0]);
            Object.assign(this, updatedUser);
            return this;
        } catch (error) {
            throw new Error(`Failed to update resume: ${error.message}`);
        }
    }

    // Deactivate user
    async deactivate() {
        const query = 'UPDATE users SET is_active = false WHERE id = $1 RETURNING *';
        try {
            const result = await pool.query(query, [this.id]);
            this.is_active = false;
            return this;
        } catch (error) {
            throw new Error(`Failed to deactivate user: ${error.message}`);
        }
    }

    // Get user's applications
    async getApplications() {
        const query = `
            SELECT a.*, j.title as job_title, c.name as company_name
            FROM applications a
            JOIN jobs j ON a.job_id = j.id
            JOIN companies c ON j.company_id = c.id
            WHERE a.user_id = $1
            ORDER BY a.applied_at DESC
        `;
        try {
            const result = await pool.query(query, [this.id]);
            return result.rows;
        } catch (error) {
            throw new Error(`Failed to get user applications: ${error.message}`);
        }
    }

    // Get user's AI settings
    async getAISettings() {
        const query = 'SELECT * FROM ai_settings WHERE user_id = $1 ORDER BY is_default DESC, created_at DESC';
        try {
            const result = await pool.query(query, [this.id]);
            return result.rows;
        } catch (error) {
            throw new Error(`Failed to get AI settings: ${error.message}`);
        }
    }

    // Get default AI settings
    async getDefaultAISettings() {
        const query = 'SELECT * FROM ai_settings WHERE user_id = $1 AND is_default = true';
        try {
            const result = await pool.query(query, [this.id]);
            return result.rows[0] || null;
        } catch (error) {
            throw new Error(`Failed to get default AI settings: ${error.message}`);
        }
    }

    // Convert to JSON (exclude sensitive data)
    toJSON() {
        const { password_hash, ...userData } = this;
        return userData;
    }

    // Get user statistics
    async getStats() {
        const query = `
            SELECT 
                COUNT(DISTINCT a.id) as total_applications,
                COUNT(DISTINCT CASE WHEN a.status = 'applied' THEN a.id END) as pending_applications,
                COUNT(DISTINCT CASE WHEN a.status = 'interviewed' THEN a.id END) as interviews,
                COUNT(DISTINCT CASE WHEN a.status = 'accepted' THEN a.id END) as offers,
                COUNT(DISTINCT j.company_id) as companies_applied_to,
                COUNT(DISTINCT qa.id) as questions_answered
            FROM applications a
            JOIN jobs j ON a.job_id = j.id
            LEFT JOIN questions_answers qa ON a.id = qa.application_id
            WHERE a.user_id = $1
        `;
        try {
            const result = await pool.query(query, [this.id]);
            return result.rows[0];
        } catch (error) {
            throw new Error(`Failed to get user stats: ${error.message}`);
        }
    }
}

module.exports = User; 