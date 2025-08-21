const { pool } = require('../connection.cjs');

class Filter {
    constructor(filterData) {
        this.id = filterData.id;
        this.user_id = filterData.user_id;
        this.name = filterData.name;
        this.description = filterData.description;
        this.type = filterData.type;
        this.keywords = filterData.keywords;
        this.action = filterData.action;
        this.match_type = filterData.match_type;
        this.is_active = filterData.is_active;
        this.priority = filterData.priority;
        this.created_at = filterData.created_at;
        this.updated_at = filterData.updated_at;
    }

    // Create a new filter
    static async create(filterData) {
        const query = `
            INSERT INTO filters (user_id, name, description, type, keywords, action, match_type, is_active, priority)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            RETURNING *
        `;
        const values = [
            filterData.user_id,
            filterData.name,
            filterData.description,
            filterData.type,
            JSON.stringify(filterData.keywords),
            filterData.action,
            filterData.match_type,
            filterData.is_active,
            filterData.priority || 0
        ];

        try {
            const result = await pool.query(query, values);
            const filter = new Filter(result.rows[0]);
            // Parse keywords back to array
            // Keywords are already parsed by pg driver
            return filter;
        } catch (error) {
            throw new Error(`Failed to create filter: ${error.message}`);
        }
    }

    // Find filter by ID
    static async findById(id) {
        const query = 'SELECT * FROM filters WHERE id = $1';
        try {
            const result = await pool.query(query, [id]);
            if (!result.rows[0]) return null;
            
            const filter = new Filter(result.rows[0]);
            // Keywords are already parsed by pg driver
            return filter;
        } catch (error) {
            throw new Error(`Failed to find filter by ID: ${error.message}`);
        }
    }

    // Find all filters by user ID
    static async findByUserId(userId) {
        const query = 'SELECT * FROM filters WHERE user_id = $1 ORDER BY priority DESC, created_at ASC';
        try {
            const result = await pool.query(query, [userId]);
            return result.rows.map(row => {
                const filter = new Filter(row);
                // Keywords are already parsed by pg driver
                return filter;
            });
        } catch (error) {
            throw new Error(`Failed to find filters by user ID: ${error.message}`);
        }
    }

    // Find active filters by user ID
    static async findActiveByUserId(userId) {
        const query = 'SELECT * FROM filters WHERE user_id = $1 AND is_active = true ORDER BY priority DESC, created_at ASC';
        try {
            const result = await pool.query(query, [userId]);
            return result.rows.map(row => {
                const filter = new Filter(row);
                // Keywords are already parsed by pg driver
                return filter;
            });
        } catch (error) {
            throw new Error(`Failed to find active filters by user ID: ${error.message}`);
        }
    }

    // Update filter data
    async update(updateData) {
        const fields = [];
        const values = [];
        let paramCount = 1;

        // Build dynamic update query
        for (const [key, value] of Object.entries(updateData)) {
            if (key !== 'id' && value !== undefined) {
                if (key === 'keywords') {
                    fields.push(`${key} = $${paramCount}`);
                    values.push(JSON.stringify(value));
                } else {
                    fields.push(`${key} = $${paramCount}`);
                    values.push(value);
                }
                paramCount++;
            }
        }

        if (fields.length === 0) {
            throw new Error('No fields to update');
        }

        const query = `
            UPDATE filters 
            SET ${fields.join(', ')}, updated_at = NOW()
            WHERE id = $${paramCount}
            RETURNING *
        `;
        values.push(this.id);

        try {
            const result = await pool.query(query, values);
            const updatedFilter = new Filter(result.rows[0]);
            // Keywords are already parsed by pg driver
            Object.assign(this, updatedFilter);
            return this;
        } catch (error) {
            throw new Error(`Failed to update filter: ${error.message}`);
        }
    }

    // Delete filter
    async delete() {
        const query = 'DELETE FROM filters WHERE id = $1 RETURNING *';
        try {
            const result = await pool.query(query, [this.id]);
            return result.rows[0] ? true : false;
        } catch (error) {
            throw new Error(`Failed to delete filter: ${error.message}`);
        }
    }

    // Delete filter by ID (static method)
    static async deleteById(id) {
        const query = 'DELETE FROM filters WHERE id = $1 RETURNING *';
        try {
            const result = await pool.query(query, [id]);
            return result.rows[0] ? true : false;
        } catch (error) {
            throw new Error(`Failed to delete filter by ID: ${error.message}`);
        }
    }
}

module.exports = Filter;
