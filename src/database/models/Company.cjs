const { pool } = require('../connection.cjs');

class Company {
    constructor(companyData) {
        this.id = companyData.id;
        this.name = companyData.name;
        this.industry = companyData.industry;
        this.size = companyData.size;
        this.location = companyData.location;
        this.website = companyData.website;
        this.linkedin_url = companyData.linkedin_url;
        this.created_at = companyData.created_at;
        this.updated_at = companyData.updated_at;
    }

    // Create a new company
    static async create(companyData) {
        const query = `
            INSERT INTO companies (name, industry, size, location, website, linkedin_url)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING *
        `;
        const values = [
            companyData.name,
            companyData.industry,
            companyData.size,
            companyData.location,
            companyData.website,
            companyData.linkedin_url
        ];

        try {
            const result = await pool.query(query, values);
            return new Company(result.rows[0]);
        } catch (error) {
            throw new Error(`Failed to create company: ${error.message}`);
        }
    }

    // Find company by ID
    static async findById(id) {
        const query = 'SELECT * FROM companies WHERE id = $1';
        try {
            const result = await pool.query(query, [id]);
            return result.rows[0] ? new Company(result.rows[0]) : null;
        } catch (error) {
            throw new Error(`Failed to find company by ID: ${error.message}`);
        }
    }

    // Find company by name
    static async findByName(name) {
        const query = 'SELECT * FROM companies WHERE LOWER(name) = LOWER($1)';
        try {
            const result = await pool.query(query, [name]);
            return result.rows[0] ? new Company(result.rows[0]) : null;
        } catch (error) {
            throw new Error(`Failed to find company by name: ${error.message}`);
        }
    }

    // Search companies by name or industry
    static async search(searchTerm, limit = 20) {
        const query = `
            SELECT * FROM companies 
            WHERE LOWER(name) LIKE LOWER($1) OR LOWER(industry) LIKE LOWER($1)
            ORDER BY name
            LIMIT $2
        `;
        try {
            const result = await pool.query(query, [`%${searchTerm}%`, limit]);
            return result.rows.map(row => new Company(row));
        } catch (error) {
            throw new Error(`Failed to search companies: ${error.message}`);
        }
    }

    // Get companies by industry
    static async findByIndustry(industry) {
        const query = 'SELECT * FROM companies WHERE LOWER(industry) = LOWER($1) ORDER BY name';
        try {
            const result = await pool.query(query, [industry]);
            return result.rows.map(row => new Company(row));
        } catch (error) {
            throw new Error(`Failed to find companies by industry: ${error.message}`);
        }
    }

    // Get companies by size
    static async findBySize(size) {
        const query = 'SELECT * FROM companies WHERE LOWER(size) = LOWER($1) ORDER BY name';
        try {
            const result = await pool.query(query, [size]);
            return result.rows.map(row => new Company(row));
        } catch (error) {
            throw new Error(`Failed to find companies by size: ${error.message}`);
        }
    }

    // Update company data
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
            UPDATE companies 
            SET ${fields.join(', ')} 
            WHERE id = $${paramCount}
            RETURNING *
        `;
        values.push(this.id);

        try {
            const result = await pool.query(query, values);
            const updatedCompany = new Company(result.rows[0]);
            Object.assign(this, updatedCompany);
            return this;
        } catch (error) {
            throw new Error(`Failed to update company: ${error.message}`);
        }
    }

    // Get jobs for this company
    async getJobs() {
        const query = 'SELECT * FROM jobs WHERE company_id = $1 ORDER BY posted_date DESC';
        try {
            const result = await pool.query(query, [this.id]);
            return result.rows;
        } catch (error) {
            throw new Error(`Failed to get company jobs: ${error.message}`);
        }
    }

    // Get active jobs for this company
    async getActiveJobs() {
        const query = 'SELECT * FROM jobs WHERE company_id = $1 AND status = $2 ORDER BY posted_date DESC';
        try {
            const result = await pool.query(query, [this.id, 'active']);
            return result.rows;
        } catch (error) {
            throw new Error(`Failed to get active company jobs: ${error.message}`);
        }
    }

    // Get applications to this company's jobs
    async getApplications() {
        const query = `
            SELECT a.*, j.title as job_title, u.username, u.email
            FROM applications a
            JOIN jobs j ON a.job_id = j.id
            JOIN users u ON a.user_id = u.id
            WHERE j.company_id = $1
            ORDER BY a.applied_at DESC
        `;
        try {
            const result = await pool.query(query, [this.id]);
            return result.rows;
        } catch (error) {
            throw new Error(`Failed to get company applications: ${error.message}`);
        }
    }

    // Get company statistics
    async getStats() {
        const query = `
            SELECT 
                COUNT(DISTINCT j.id) as total_jobs,
                COUNT(DISTINCT CASE WHEN j.status = 'active' THEN j.id END) as active_jobs,
                COUNT(DISTINCT a.id) as total_applications,
                COUNT(DISTINCT a.user_id) as unique_applicants,
                AVG(j.applicant_count) as avg_applicants_per_job
            FROM jobs j
            LEFT JOIN applications a ON j.id = a.job_id
            WHERE j.company_id = $1
        `;
        try {
            const result = await pool.query(query, [this.id]);
            return result.rows[0];
        } catch (error) {
            throw new Error(`Failed to get company stats: ${error.message}`);
        }
    }

    // Get all companies statistics
    static async getStats() {
        const query = `
            SELECT 
                COUNT(*) as total_companies,
                COUNT(DISTINCT industry) as unique_industries,
                COUNT(CASE WHEN size = 'startup' THEN 1 END) as startups,
                COUNT(CASE WHEN size = 'medium' THEN 1 END) as medium_companies,
                COUNT(CASE WHEN size = 'large' THEN 1 END) as large_companies
            FROM companies
        `;
        try {
            const result = await pool.query(query);
            return result.rows[0];
        } catch (error) {
            throw new Error(`Failed to get companies stats: ${error.message}`);
        }
    }

    // Get all industries
    static async getIndustries() {
        const query = 'SELECT DISTINCT industry FROM companies WHERE industry IS NOT NULL ORDER BY industry';
        try {
            const result = await pool.query(query);
            return result.rows.map(row => row.industry);
        } catch (error) {
            throw new Error(`Failed to get industries: ${error.message}`);
        }
    }

    // Delete company (only if no jobs)
    async delete() {
        try {
            // Check if company has jobs
            const jobQuery = 'SELECT COUNT(*) as count FROM jobs WHERE company_id = $1';
            const jobResult = await pool.query(jobQuery, [this.id]);
            
            if (parseInt(jobResult.rows[0].count) > 0) {
                throw new Error('Cannot delete company: it has associated jobs');
            }

            const query = 'DELETE FROM companies WHERE id = $1';
            await pool.query(query, [this.id]);
            return true;
        } catch (error) {
            throw new Error(`Failed to delete company: ${error.message}`);
        }
    }

    // Convert to JSON for API responses
    toJSON() {
        return {
            id: this.id,
            name: this.name,
            industry: this.industry,
            size: this.size,
            location: this.location,
            website: this.website,
            linkedin_url: this.linkedin_url,
            created_at: this.created_at,
            updated_at: this.updated_at
        };
    }
}

module.exports = Company; 