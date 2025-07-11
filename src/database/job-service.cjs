const Job = require('./models/Job.cjs');

class JobService {
    
    // Create a new job
    static async createJob(jobData) {
        try {
            const job = await Job.create(jobData);
            return job.toJSON();
        } catch (error) {
            throw new Error(`Failed to create job: ${error.message}`);
        }
    }

    // Get job by ID
    static async getJobById(id) {
        try {
            const job = await Job.findById(id);
            return job ? job.toJSON() : null;
        } catch (error) {
            throw new Error(`Failed to get job by ID: ${error.message}`);
        }
    }

    // Get job by platform and platform job ID
    static async getJobByPlatformId(platform, platformJobId) {
        try {
            const job = await Job.findByPlatformId(platform, platformJobId);
            return job ? job.toJSON() : null;
        } catch (error) {
            throw new Error(`Failed to get job by platform ID: ${error.message}`);
        }
    }

    // Get jobs by company
    static async getJobsByCompany(companyId) {
        try {
            const jobs = await Job.findByCompany(companyId);
            return jobs.map(job => job.toJSON());
        } catch (error) {
            throw new Error(`Failed to get jobs by company: ${error.message}`);
        }
    }

    // Search jobs by title or description
    static async searchJobs(searchTerm, limit = 20) {
        try {
            const jobs = await Job.search(searchTerm, limit);
            return jobs.map(job => job.toJSON());
        } catch (error) {
            throw new Error(`Failed to search jobs: ${error.message}`);
        }
    }

    // Get recent jobs
    static async getRecentJobs(limit = 20) {
        try {
            const jobs = await Job.getRecent(limit);
            return jobs.map(job => job.toJSON());
        } catch (error) {
            throw new Error(`Failed to get recent jobs: ${error.message}`);
        }
    }

    // Get remote jobs
    static async getRemoteJobs(limit = 20) {
        try {
            const jobs = await Job.getRemoteJobs(limit);
            return jobs.map(job => job.toJSON());
        } catch (error) {
            throw new Error(`Failed to get remote jobs: ${error.message}`);
        }
    }

    // Update job
    static async updateJob(id, updateData) {
        try {
            const job = await Job.findById(id);
            if (!job) {
                throw new Error('Job not found');
            }
            
            await job.update(updateData);
            return job.toJSON();
        } catch (error) {
            throw new Error(`Failed to update job: ${error.message}`);
        }
    }

    // Get job with company details
    static async getJobWithCompany(id) {
        try {
            const job = await Job.findById(id);
            if (!job) {
                throw new Error('Job not found');
            }
            
            const jobWithCompany = await job.getWithCompany();
            return jobWithCompany;
        } catch (error) {
            throw new Error(`Failed to get job with company: ${error.message}`);
        }
    }

    // Get applications for a job
    static async getJobApplications(id) {
        try {
            const job = await Job.findById(id);
            if (!job) {
                throw new Error('Job not found');
            }
            
            const applications = await job.getApplications();
            return applications;
        } catch (error) {
            throw new Error(`Failed to get job applications: ${error.message}`);
        }
    }

    // Get job statistics
    static async getJobStats() {
        try {
            const stats = await Job.getStats();
            return {
                total_jobs: parseInt(stats.total_jobs) || 0,
                active_jobs: parseInt(stats.active_jobs) || 0,
                remote_jobs: parseInt(stats.remote_jobs) || 0,
                platforms: parseInt(stats.platforms) || 0,
                companies: parseInt(stats.companies) || 0,
                avg_applicants: parseFloat(stats.avg_applicants) || 0
            };
        } catch (error) {
            throw new Error(`Failed to get job statistics: ${error.message}`);
        }
    }

    // Mark job as closed
    static async markJobClosed(id) {
        try {
            const job = await Job.findById(id);
            if (!job) {
                throw new Error('Job not found');
            }
            
            await job.markClosed();
            return job.toJSON();
        } catch (error) {
            throw new Error(`Failed to mark job as closed: ${error.message}`);
        }
    }

    // Delete a job
    static async deleteJob(id) {
        try {
            const job = await Job.findById(id);
            if (!job) {
                throw new Error('Job not found');
            }
            
            await job.delete();
            return true;
        } catch (error) {
            throw new Error(`Failed to delete job: ${error.message}`);
        }
    }

    // Check if job exists
    static async jobExists(id) {
        try {
            const job = await Job.findById(id);
            return job !== null;
        } catch (error) {
            throw new Error(`Failed to check if job exists: ${error.message}`);
        }
    }

    // Check if job exists by platform ID
    static async jobExistsByPlatformId(platform, platformJobId) {
        try {
            const job = await Job.findByPlatformId(platform, platformJobId);
            return job !== null;
        } catch (error) {
            throw new Error(`Failed to check if job exists by platform ID: ${error.message}`);
        }
    }

    // Get all jobs (with pagination)
    static async getAllJobs(limit = 50, offset = 0) {
        try {
            const { pool } = require('./connection.cjs');
            
            const query = `
                SELECT j.*, c.name as company_name
                FROM jobs j
                JOIN companies c ON j.company_id = c.id
                ORDER BY j.posted_date DESC
                LIMIT $1 OFFSET $2
            `;
            
            const result = await pool.query(query, [limit, offset]);
            return result.rows.map(row => new Job(row).toJSON());
        } catch (error) {
            throw new Error(`Failed to get all jobs: ${error.message}`);
        }
    }

    // Get jobs count
    static async getJobsCount() {
        try {
            const { pool } = require('./connection.cjs');
            
            const query = 'SELECT COUNT(*) as count FROM jobs';
            const result = await pool.query(query);
            return parseInt(result.rows[0].count) || 0;
        } catch (error) {
            throw new Error(`Failed to get jobs count: ${error.message}`);
        }
    }

    // Get jobs by status
    static async getJobsByStatus(status, limit = 50) {
        try {
            const { pool } = require('./connection.cjs');
            
            const query = `
                SELECT j.*, c.name as company_name
                FROM jobs j
                JOIN companies c ON j.company_id = c.id
                WHERE j.status = $1
                ORDER BY j.posted_date DESC
                LIMIT $2
            `;
            
            const result = await pool.query(query, [status, limit]);
            return result.rows.map(row => new Job(row).toJSON());
        } catch (error) {
            throw new Error(`Failed to get jobs by status: ${error.message}`);
        }
    }

    // Get jobs by job type
    static async getJobsByType(jobType, limit = 50) {
        try {
            const { pool } = require('./connection.cjs');
            
            const query = `
                SELECT j.*, c.name as company_name
                FROM jobs j
                JOIN companies c ON j.company_id = c.id
                WHERE j.job_type = $1 AND j.status = 'active'
                ORDER BY j.posted_date DESC
                LIMIT $2
            `;
            
            const result = await pool.query(query, [jobType, limit]);
            return result.rows.map(row => new Job(row).toJSON());
        } catch (error) {
            throw new Error(`Failed to get jobs by type: ${error.message}`);
        }
    }

    // Get jobs by platform
    static async getJobsByPlatform(platform, limit = 50) {
        try {
            const { pool } = require('./connection.cjs');
            
            const query = `
                SELECT j.*, c.name as company_name
                FROM jobs j
                JOIN companies c ON j.company_id = c.id
                WHERE j.platform = $1 AND j.status = 'active'
                ORDER BY j.posted_date DESC
                LIMIT $2
            `;
            
            const result = await pool.query(query, [platform, limit]);
            return result.rows.map(row => new Job(row).toJSON());
        } catch (error) {
            throw new Error(`Failed to get jobs by platform: ${error.message}`);
        }
    }

    // Get jobs by location
    static async getJobsByLocation(location, limit = 50) {
        try {
            const { pool } = require('./connection.cjs');
            
            const query = `
                SELECT j.*, c.name as company_name
                FROM jobs j
                JOIN companies c ON j.company_id = c.id
                WHERE LOWER(j.location) LIKE LOWER($1) AND j.status = 'active'
                ORDER BY j.posted_date DESC
                LIMIT $2
            `;
            
            const result = await pool.query(query, [`%${location}%`, limit]);
            return result.rows.map(row => new Job(row).toJSON());
        } catch (error) {
            throw new Error(`Failed to get jobs by location: ${error.message}`);
        }
    }

    // Get all platforms
    static async getPlatforms() {
        try {
            const { pool } = require('./connection.cjs');
            
            const query = 'SELECT DISTINCT platform FROM jobs WHERE platform IS NOT NULL ORDER BY platform';
            const result = await pool.query(query);
            return result.rows.map(row => row.platform);
        } catch (error) {
            throw new Error(`Failed to get platforms: ${error.message}`);
        }
    }

    // Get all job types
    static async getJobTypes() {
        try {
            const { pool } = require('./connection.cjs');
            
            const query = 'SELECT DISTINCT job_type FROM jobs WHERE job_type IS NOT NULL ORDER BY job_type';
            const result = await pool.query(query);
            return result.rows.map(row => row.job_type);
        } catch (error) {
            throw new Error(`Failed to get job types: ${error.message}`);
        }
    }

    // Get all locations
    static async getLocations() {
        try {
            const { pool } = require('./connection.cjs');
            
            const query = 'SELECT DISTINCT location FROM jobs WHERE location IS NOT NULL ORDER BY location';
            const result = await pool.query(query);
            return result.rows.map(row => row.location);
        } catch (error) {
            throw new Error(`Failed to get locations: ${error.message}`);
        }
    }
}

module.exports = JobService; 