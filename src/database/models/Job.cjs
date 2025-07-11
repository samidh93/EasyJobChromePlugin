const { pool } = require('../connection.cjs');

class Job {
    constructor(jobData) {
        this.id = jobData.id;
        this.company_id = jobData.company_id;
        this.title = jobData.title;
        this.location = jobData.location;
        this.is_remote = jobData.is_remote;
        this.job_type = jobData.job_type;
        this.platform = jobData.platform;
        this.platform_job_id = jobData.platform_job_id;
        this.job_url = jobData.job_url;
        this.job_description = jobData.job_description;
        this.applicant_count = jobData.applicant_count;
        this.posted_date = jobData.posted_date;
        this.status = jobData.status;
        this.created_at = jobData.created_at;
        this.updated_at = jobData.updated_at;
    }

    // Create a new job
    static async create(jobData) {
        const query = `
            INSERT INTO jobs (company_id, title, location, is_remote, job_type, platform, 
                            platform_job_id, job_url, job_description, applicant_count, posted_date, status)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
            RETURNING *
        `;
        const values = [
            jobData.company_id,
            jobData.title,
            jobData.location,
            jobData.is_remote || false,
            jobData.job_type,
            jobData.platform,
            jobData.platform_job_id,
            jobData.job_url,
            jobData.job_description,
            jobData.applicant_count || 0,
            jobData.posted_date,
            jobData.status || 'active'
        ];

        try {
            const result = await pool.query(query, values);
            return new Job(result.rows[0]);
        } catch (error) {
            throw new Error(`Failed to create job: ${error.message}`);
        }
    }

    // Find job by ID
    static async findById(id) {
        const query = 'SELECT * FROM jobs WHERE id = $1';
        try {
            const result = await pool.query(query, [id]);
            return result.rows[0] ? new Job(result.rows[0]) : null;
        } catch (error) {
            throw new Error(`Failed to find job by ID: ${error.message}`);
        }
    }

    // Find job by platform and platform job ID
    static async findByPlatformId(platform, platformJobId) {
        const query = 'SELECT * FROM jobs WHERE platform = $1 AND platform_job_id = $2';
        try {
            const result = await pool.query(query, [platform, platformJobId]);
            return result.rows[0] ? new Job(result.rows[0]) : null;
        } catch (error) {
            throw new Error(`Failed to find job by platform ID: ${error.message}`);
        }
    }

    // Find jobs by company
    static async findByCompany(companyId) {
        const query = 'SELECT * FROM jobs WHERE company_id = $1 ORDER BY posted_date DESC';
        try {
            const result = await pool.query(query, [companyId]);
            return result.rows.map(row => new Job(row));
        } catch (error) {
            throw new Error(`Failed to find jobs by company: ${error.message}`);
        }
    }

    // Search jobs by title or description
    static async search(searchTerm, limit = 20) {
        const query = `
            SELECT j.*, c.name as company_name
            FROM jobs j
            JOIN companies c ON j.company_id = c.id
            WHERE to_tsvector('english', j.title || ' ' || COALESCE(j.job_description, '')) 
                  @@ plainto_tsquery('english', $1)
            ORDER BY posted_date DESC
            LIMIT $2
        `;
        try {
            const result = await pool.query(query, [searchTerm, limit]);
            return result.rows.map(row => new Job(row));
        } catch (error) {
            throw new Error(`Failed to search jobs: ${error.message}`);
        }
    }

    // Get recent jobs
    static async getRecent(limit = 20) {
        const query = `
            SELECT j.*, c.name as company_name
            FROM jobs j
            JOIN companies c ON j.company_id = c.id
            WHERE j.status = 'active'
            ORDER BY j.posted_date DESC
            LIMIT $1
        `;
        try {
            const result = await pool.query(query, [limit]);
            return result.rows.map(row => new Job(row));
        } catch (error) {
            throw new Error(`Failed to get recent jobs: ${error.message}`);
        }
    }

    // Get remote jobs
    static async getRemoteJobs(limit = 20) {
        const query = `
            SELECT j.*, c.name as company_name
            FROM jobs j
            JOIN companies c ON j.company_id = c.id
            WHERE j.is_remote = true AND j.status = 'active'
            ORDER BY j.posted_date DESC
            LIMIT $1
        `;
        try {
            const result = await pool.query(query, [limit]);
            return result.rows.map(row => new Job(row));
        } catch (error) {
            throw new Error(`Failed to get remote jobs: ${error.message}`);
        }
    }

    // Update job data
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
            UPDATE jobs 
            SET ${fields.join(', ')} 
            WHERE id = $${paramCount}
            RETURNING *
        `;
        values.push(this.id);

        try {
            const result = await pool.query(query, values);
            const updatedJob = new Job(result.rows[0]);
            Object.assign(this, updatedJob);
            return this;
        } catch (error) {
            throw new Error(`Failed to update job: ${error.message}`);
        }
    }

    // Get job with company details
    async getWithCompany() {
        const query = `
            SELECT j.*, c.name as company_name, c.industry, c.size, c.website, c.linkedin_url
            FROM jobs j
            JOIN companies c ON j.company_id = c.id
            WHERE j.id = $1
        `;
        try {
            const result = await pool.query(query, [this.id]);
            return result.rows[0] || null;
        } catch (error) {
            throw new Error(`Failed to get job with company: ${error.message}`);
        }
    }

    // Get applications for this job
    async getApplications() {
        const query = `
            SELECT a.*, u.username, u.email, r.name as resume_name
            FROM applications a
            JOIN users u ON a.user_id = u.id
            JOIN resume r ON a.resume_id = r.id
            WHERE a.job_id = $1
            ORDER BY a.applied_at DESC
        `;
        try {
            const result = await pool.query(query, [this.id]);
            return result.rows;
        } catch (error) {
            throw new Error(`Failed to get job applications: ${error.message}`);
        }
    }

    // Get job statistics
    static async getStats() {
        const query = `
            SELECT 
                COUNT(*) as total_jobs,
                COUNT(CASE WHEN status = 'active' THEN 1 END) as active_jobs,
                COUNT(CASE WHEN is_remote = true THEN 1 END) as remote_jobs,
                COUNT(DISTINCT platform) as platforms,
                COUNT(DISTINCT company_id) as companies,
                AVG(applicant_count) as avg_applicants
            FROM jobs
        `;
        try {
            const result = await pool.query(query);
            return result.rows[0];
        } catch (error) {
            throw new Error(`Failed to get job stats: ${error.message}`);
        }
    }

    // Mark job as closed
    async markClosed() {
        const query = 'UPDATE jobs SET status = $1 WHERE id = $2 RETURNING *';
        try {
            const result = await pool.query(query, ['closed', this.id]);
            this.status = 'closed';
            return this;
        } catch (error) {
            throw new Error(`Failed to mark job as closed: ${error.message}`);
        }
    }

    // Delete job (only if no applications)
    async delete() {
        try {
            // Check if job has applications
            const appQuery = 'SELECT COUNT(*) as count FROM applications WHERE job_id = $1';
            const appResult = await pool.query(appQuery, [this.id]);
            
            if (parseInt(appResult.rows[0].count) > 0) {
                throw new Error('Cannot delete job: it has associated applications');
            }

            const query = 'DELETE FROM jobs WHERE id = $1';
            await pool.query(query, [this.id]);
            return true;
        } catch (error) {
            throw new Error(`Failed to delete job: ${error.message}`);
        }
    }

    // Convert to JSON for API responses
    toJSON() {
        return {
            id: this.id,
            company_id: this.company_id,
            title: this.title,
            location: this.location,
            is_remote: this.is_remote,
            job_type: this.job_type,
            platform: this.platform,
            platform_job_id: this.platform_job_id,
            job_url: this.job_url,
            job_description: this.job_description,
            applicant_count: this.applicant_count,
            posted_date: this.posted_date,
            status: this.status,
            created_at: this.created_at,
            updated_at: this.updated_at,
            // Include additional fields if they exist (from joins)
            ...(this.company_name && { company_name: this.company_name }),
            ...(this.industry && { industry: this.industry }),
            ...(this.size && { size: this.size }),
            ...(this.website && { website: this.website }),
            ...(this.linkedin_url && { linkedin_url: this.linkedin_url })
        };
    }
}

module.exports = Job; 