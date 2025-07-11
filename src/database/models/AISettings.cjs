const { pool } = require('../connection.cjs');

class AISettings {
    constructor(settingsData) {
        this.id = settingsData.id;
        this.user_id = settingsData.user_id;
        this.ai_provider = settingsData.ai_provider;
        this.ai_model = settingsData.ai_model;
        this.api_key_encrypted = settingsData.api_key_encrypted;
        this.is_default = settingsData.is_default;
        this.created_at = settingsData.created_at;
        this.updated_at = settingsData.updated_at;
    }

    // Create new AI settings
    static async create(settingsData) {
        const query = `
            INSERT INTO ai_settings (user_id, ai_provider, ai_model, api_key_encrypted, is_default)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING *
        `;
        const values = [
            settingsData.user_id,
            settingsData.ai_provider,
            settingsData.ai_model,
            settingsData.api_key_encrypted,
            settingsData.is_default || false
        ];

        try {
            const result = await pool.query(query, values);
            return new AISettings(result.rows[0]);
        } catch (error) {
            throw new Error(`Failed to create AI settings: ${error.message}`);
        }
    }

    // Find AI settings by ID
    static async findById(id) {
        const query = 'SELECT * FROM ai_settings WHERE id = $1';
        try {
            const result = await pool.query(query, [id]);
            return result.rows[0] ? new AISettings(result.rows[0]) : null;
        } catch (error) {
            throw new Error(`Failed to find AI settings by ID: ${error.message}`);
        }
    }

    // Find AI settings by user ID
    static async findByUserId(userId) {
        const query = 'SELECT * FROM ai_settings WHERE user_id = $1 ORDER BY is_default DESC, created_at DESC';
        try {
            const result = await pool.query(query, [userId]);
            return result.rows.map(row => new AISettings(row));
        } catch (error) {
            throw new Error(`Failed to find AI settings by user ID: ${error.message}`);
        }
    }

    // Find default AI settings for user
    static async findDefaultByUserId(userId) {
        const query = 'SELECT * FROM ai_settings WHERE user_id = $1 AND is_default = true';
        try {
            const result = await pool.query(query, [userId]);
            return result.rows[0] ? new AISettings(result.rows[0]) : null;
        } catch (error) {
            throw new Error(`Failed to find default AI settings: ${error.message}`);
        }
    }

    // Find AI settings by provider
    static async findByProvider(provider, userId = null) {
        let query = 'SELECT * FROM ai_settings WHERE ai_provider = $1';
        const values = [provider];

        if (userId) {
            query += ' AND user_id = $2';
            values.push(userId);
        }

        query += ' ORDER BY is_default DESC, created_at DESC';

        try {
            const result = await pool.query(query, values);
            return result.rows.map(row => new AISettings(row));
        } catch (error) {
            throw new Error(`Failed to find AI settings by provider: ${error.message}`);
        }
    }

    // Update AI settings
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
            UPDATE ai_settings 
            SET ${fields.join(', ')} 
            WHERE id = $${paramCount}
            RETURNING *
        `;
        values.push(this.id);

        try {
            const result = await pool.query(query, values);
            const updatedSettings = new AISettings(result.rows[0]);
            Object.assign(this, updatedSettings);
            return this;
        } catch (error) {
            throw new Error(`Failed to update AI settings: ${error.message}`);
        }
    }

    // Set as default AI settings (unsets other defaults for this user)
    async setAsDefault() {
        try {
            // Start transaction
            await pool.query('BEGIN');

            // Unset all defaults for this user
            await pool.query(
                'UPDATE ai_settings SET is_default = false WHERE user_id = $1',
                [this.user_id]
            );

            // Set this settings as default
            const result = await pool.query(
                'UPDATE ai_settings SET is_default = true WHERE id = $1 RETURNING *',
                [this.id]
            );

            await pool.query('COMMIT');

            const updatedSettings = new AISettings(result.rows[0]);
            Object.assign(this, updatedSettings);
            return this;
        } catch (error) {
            await pool.query('ROLLBACK');
            throw new Error(`Failed to set AI settings as default: ${error.message}`);
        }
    }

    // Get applications that used these AI settings
    async getApplications() {
        const query = `
            SELECT a.*, j.title as job_title, c.name as company_name
            FROM applications a
            JOIN jobs j ON a.job_id = j.id
            JOIN companies c ON j.company_id = c.id
            WHERE a.ai_settings_id = $1
            ORDER BY a.applied_at DESC
        `;
        try {
            const result = await pool.query(query, [this.id]);
            return result.rows;
        } catch (error) {
            throw new Error(`Failed to get applications for AI settings: ${error.message}`);
        }
    }

    // Check if AI settings can be deleted (not used in applications)
    async canDelete() {
        const query = 'SELECT COUNT(*) as count FROM applications WHERE ai_settings_id = $1';
        try {
            const result = await pool.query(query, [this.id]);
            return parseInt(result.rows[0].count) === 0;
        } catch (error) {
            throw new Error(`Failed to check if AI settings can be deleted: ${error.message}`);
        }
    }

    // Delete AI settings (only if not used in applications)
    async delete() {
        try {
            const canDelete = await this.canDelete();
            if (!canDelete) {
                throw new Error('Cannot delete AI settings: they are referenced by existing applications');
            }

            const query = 'DELETE FROM ai_settings WHERE id = $1';
            await pool.query(query, [this.id]);
            return true;
        } catch (error) {
            throw new Error(`Failed to delete AI settings: ${error.message}`);
        }
    }

    // Get AI settings statistics
    static async getStats(userId = null) {
        let query = `
            SELECT 
                COUNT(*) as total_settings,
                COUNT(CASE WHEN is_default = true THEN 1 END) as default_settings,
                COUNT(DISTINCT ai_provider) as unique_providers,
                COUNT(DISTINCT ai_model) as unique_models
            FROM ai_settings
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
            throw new Error(`Failed to get AI settings stats: ${error.message}`);
        }
    }

    // Get all available providers
    static async getProviders(userId = null) {
        let query = 'SELECT DISTINCT ai_provider FROM ai_settings WHERE ai_provider IS NOT NULL';
        const values = [];

        if (userId) {
            query += ' AND user_id = $1';
            values.push(userId);
        }

        query += ' ORDER BY ai_provider';

        try {
            const result = await pool.query(query, values);
            return result.rows.map(row => row.ai_provider);
        } catch (error) {
            throw new Error(`Failed to get AI providers: ${error.message}`);
        }
    }

    // Get all available models for a provider
    static async getModelsByProvider(provider, userId = null) {
        let query = 'SELECT DISTINCT ai_model FROM ai_settings WHERE ai_provider = $1 AND ai_model IS NOT NULL';
        const values = [provider];

        if (userId) {
            query += ' AND user_id = $2';
            values.push(userId);
        }

        query += ' ORDER BY ai_model';

        try {
            const result = await pool.query(query, values);
            return result.rows.map(row => row.ai_model);
        } catch (error) {
            throw new Error(`Failed to get AI models by provider: ${error.message}`);
        }
    }

    // Convert to JSON (for consistent serialization, excluding sensitive data)
    toJSON() {
        return {
            id: this.id,
            user_id: this.user_id,
            ai_provider: this.ai_provider,
            ai_model: this.ai_model,
            // Don't include api_key_encrypted in JSON output for security
            is_default: this.is_default,
            created_at: this.created_at,
            updated_at: this.updated_at
        };
    }
}

module.exports = AISettings; 