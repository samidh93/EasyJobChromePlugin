const { pool } = require('../connection.cjs');

class Resume {
    constructor(resumeData) {
        this.id = resumeData.id;
        this.name = resumeData.name;
        this.extension = resumeData.extension;
        this.path = resumeData.path;
        this.short_description = resumeData.short_description;
        this.creation_date = resumeData.creation_date;
        this.updated_date = resumeData.updated_date;
        this.user_id = resumeData.user_id;
        this.is_default = resumeData.is_default;
    }

    // Create a new resume
    static async create(resumeData) {
        const query = `
            INSERT INTO resume (name, extension, path, short_description, user_id, is_default)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING *
        `;
        const values = [
            resumeData.name,
            resumeData.extension,
            resumeData.path,
            resumeData.short_description,
            resumeData.user_id,
            resumeData.is_default || false
        ];

        try {
            const result = await pool.query(query, values);
            return new Resume(result.rows[0]);
        } catch (error) {
            throw new Error(`Failed to create resume: ${error.message}`);
        }
    }

    // Find resume by ID
    static async findById(id) {
        const query = 'SELECT * FROM resume WHERE id = $1';
        try {
            const result = await pool.query(query, [id]);
            return result.rows[0] ? new Resume(result.rows[0]) : null;
        } catch (error) {
            throw new Error(`Failed to find resume by ID: ${error.message}`);
        }
    }

    // Find resumes by user ID
    static async findByUserId(userId) {
        const query = 'SELECT * FROM resume WHERE user_id = $1 ORDER BY is_default DESC, creation_date DESC';
        try {
            const result = await pool.query(query, [userId]);
            return result.rows.map(row => new Resume(row));
        } catch (error) {
            throw new Error(`Failed to find resumes by user ID: ${error.message}`);
        }
    }

    // Find default resume for user
    static async findDefaultByUserId(userId) {
        const query = 'SELECT * FROM resume WHERE user_id = $1 AND is_default = true';
        try {
            const result = await pool.query(query, [userId]);
            return result.rows[0] ? new Resume(result.rows[0]) : null;
        } catch (error) {
            throw new Error(`Failed to find default resume: ${error.message}`);
        }
    }

    // Update resume data
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
            UPDATE resume 
            SET ${fields.join(', ')}, updated_date = NOW()
            WHERE id = $${paramCount}
            RETURNING *
        `;
        values.push(this.id);

        try {
            const result = await pool.query(query, values);
            const updatedResume = new Resume(result.rows[0]);
            Object.assign(this, updatedResume);
            return this;
        } catch (error) {
            throw new Error(`Failed to update resume: ${error.message}`);
        }
    }

    // Set as default resume (unsets other defaults for this user)
    async setAsDefault() {
        try {
            // Start transaction
            await pool.query('BEGIN');

            // Unset all defaults for this user
            await pool.query(
                'UPDATE resume SET is_default = false WHERE user_id = $1',
                [this.user_id]
            );

            // Set this resume as default
            const result = await pool.query(
                'UPDATE resume SET is_default = true WHERE id = $1 RETURNING *',
                [this.id]
            );

            await pool.query('COMMIT');

            const updatedResume = new Resume(result.rows[0]);
            Object.assign(this, updatedResume);
            return this;
        } catch (error) {
            await pool.query('ROLLBACK');
            throw new Error(`Failed to set resume as default: ${error.message}`);
        }
    }

    // Get applications that used this resume
    async getApplications() {
        const query = `
            SELECT a.*, j.title as job_title, c.name as company_name
            FROM applications a
            JOIN jobs j ON a.job_id = j.id
            JOIN companies c ON j.company_id = c.id
            WHERE a.resume_id = $1
            ORDER BY a.applied_at DESC
        `;
        try {
            const result = await pool.query(query, [this.id]);
            return result.rows;
        } catch (error) {
            throw new Error(`Failed to get applications for resume: ${error.message}`);
        }
    }

    // Check if resume can be deleted (not used in applications)
    async canDelete() {
        const query = 'SELECT COUNT(*) as count FROM applications WHERE resume_id = $1';
        try {
            const result = await pool.query(query, [this.id]);
            return parseInt(result.rows[0].count) === 0;
        } catch (error) {
            throw new Error(`Failed to check if resume can be deleted: ${error.message}`);
        }
    }

    // Delete resume (only if not used in applications)
    async delete() {
        try {
            const canDelete = await this.canDelete();
            if (!canDelete) {
                throw new Error('Cannot delete resume: it is referenced by existing applications');
            }

            const query = 'DELETE FROM resume WHERE id = $1';
            await pool.query(query, [this.id]);
            return true;
        } catch (error) {
            throw new Error(`Failed to delete resume: ${error.message}`);
        }
    }

    // Get resume statistics
    static async getStats(userId = null) {
        let query = `
            SELECT 
                COUNT(*) as total_resumes,
                COUNT(CASE WHEN is_default = true THEN 1 END) as default_resumes,
                COUNT(DISTINCT extension) as unique_extensions
            FROM resume
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
            throw new Error(`Failed to get resume stats: ${error.message}`);
        }
    }

    // Find resumes by extension
    static async findByExtension(extension, userId = null) {
        let query = 'SELECT * FROM resume WHERE extension = $1';
        const values = [extension];

        if (userId) {
            query += ' AND user_id = $2';
            values.push(userId);
        }

        query += ' ORDER BY creation_date DESC';

        try {
            const result = await pool.query(query, values);
            return result.rows.map(row => new Resume(row));
        } catch (error) {
            throw new Error(`Failed to find resumes by extension: ${error.message}`);
        }
    }
}

module.exports = Resume; 