const Company = require('./models/Company.cjs');

class CompanyService {
    
    // Create a new company
    static async createCompany(companyData) {
        try {
            const company = await Company.create(companyData);
            return company.toJSON();
        } catch (error) {
            throw new Error(`Failed to create company: ${error.message}`);
        }
    }

    // Get company by ID
    static async getCompanyById(id) {
        try {
            const company = await Company.findById(id);
            return company ? company.toJSON() : null;
        } catch (error) {
            throw new Error(`Failed to get company by ID: ${error.message}`);
        }
    }

    // Get company by name
    static async getCompanyByName(name) {
        try {
            const company = await Company.findByName(name);
            return company ? company.toJSON() : null;
        } catch (error) {
            throw new Error(`Failed to get company by name: ${error.message}`);
        }
    }

    // Search companies by name or industry
    static async searchCompanies(searchTerm, limit = 20) {
        try {
            const companies = await Company.search(searchTerm, limit);
            return companies.map(company => company.toJSON());
        } catch (error) {
            throw new Error(`Failed to search companies: ${error.message}`);
        }
    }

    // Get companies by industry
    static async getCompaniesByIndustry(industry) {
        try {
            const companies = await Company.findByIndustry(industry);
            return companies.map(company => company.toJSON());
        } catch (error) {
            throw new Error(`Failed to get companies by industry: ${error.message}`);
        }
    }

    // Get companies by size
    static async getCompaniesBySize(size) {
        try {
            const companies = await Company.findBySize(size);
            return companies.map(company => company.toJSON());
        } catch (error) {
            throw new Error(`Failed to get companies by size: ${error.message}`);
        }
    }

    // Update company
    static async updateCompany(id, updateData) {
        try {
            const company = await Company.findById(id);
            if (!company) {
                throw new Error('Company not found');
            }
            
            await company.update(updateData);
            return company.toJSON();
        } catch (error) {
            throw new Error(`Failed to update company: ${error.message}`);
        }
    }

    // Get jobs for a company
    static async getCompanyJobs(id) {
        try {
            const company = await Company.findById(id);
            if (!company) {
                throw new Error('Company not found');
            }
            
            const jobs = await company.getJobs();
            return jobs;
        } catch (error) {
            throw new Error(`Failed to get company jobs: ${error.message}`);
        }
    }

    // Get active jobs for a company
    static async getCompanyActiveJobs(id) {
        try {
            const company = await Company.findById(id);
            if (!company) {
                throw new Error('Company not found');
            }
            
            const jobs = await company.getActiveJobs();
            return jobs;
        } catch (error) {
            throw new Error(`Failed to get company active jobs: ${error.message}`);
        }
    }

    // Get applications to a company's jobs
    static async getCompanyApplications(id) {
        try {
            const company = await Company.findById(id);
            if (!company) {
                throw new Error('Company not found');
            }
            
            const applications = await company.getApplications();
            return applications;
        } catch (error) {
            throw new Error(`Failed to get company applications: ${error.message}`);
        }
    }

    // Get company statistics
    static async getCompanyStats(id) {
        try {
            const company = await Company.findById(id);
            if (!company) {
                throw new Error('Company not found');
            }
            
            const stats = await company.getStats();
            return {
                total_jobs: parseInt(stats.total_jobs) || 0,
                active_jobs: parseInt(stats.active_jobs) || 0,
                total_applications: parseInt(stats.total_applications) || 0,
                unique_applicants: parseInt(stats.unique_applicants) || 0,
                avg_applicants_per_job: parseFloat(stats.avg_applicants_per_job) || 0
            };
        } catch (error) {
            throw new Error(`Failed to get company statistics: ${error.message}`);
        }
    }

    // Get global companies statistics
    static async getGlobalCompanyStats() {
        try {
            const stats = await Company.getStats();
            return {
                total_companies: parseInt(stats.total_companies) || 0,
                unique_industries: parseInt(stats.unique_industries) || 0,
                startups: parseInt(stats.startups) || 0,
                medium_companies: parseInt(stats.medium_companies) || 0,
                large_companies: parseInt(stats.large_companies) || 0
            };
        } catch (error) {
            throw new Error(`Failed to get global company statistics: ${error.message}`);
        }
    }

    // Get all industries
    static async getIndustries() {
        try {
            const industries = await Company.getIndustries();
            return industries;
        } catch (error) {
            throw new Error(`Failed to get industries: ${error.message}`);
        }
    }

    // Delete a company
    static async deleteCompany(id) {
        try {
            const company = await Company.findById(id);
            if (!company) {
                throw new Error('Company not found');
            }
            
            await company.delete();
            return true;
        } catch (error) {
            throw new Error(`Failed to delete company: ${error.message}`);
        }
    }

    // Check if company exists
    static async companyExists(id) {
        try {
            const company = await Company.findById(id);
            return company !== null;
        } catch (error) {
            throw new Error(`Failed to check if company exists: ${error.message}`);
        }
    }

    // Check if company exists by name
    static async companyExistsByName(name) {
        try {
            const company = await Company.findByName(name);
            return company !== null;
        } catch (error) {
            throw new Error(`Failed to check if company exists by name: ${error.message}`);
        }
    }

    // Get all companies (with pagination)
    static async getAllCompanies(limit = 50, offset = 0) {
        try {
            const { pool } = require('./connection.cjs');
            
            const query = `
                SELECT * FROM companies 
                ORDER BY name
                LIMIT $1 OFFSET $2
            `;
            
            const result = await pool.query(query, [limit, offset]);
            return result.rows.map(row => new Company(row).toJSON());
        } catch (error) {
            throw new Error(`Failed to get all companies: ${error.message}`);
        }
    }

    // Get companies count
    static async getCompaniesCount() {
        try {
            const { pool } = require('./connection.cjs');
            
            const query = 'SELECT COUNT(*) as count FROM companies';
            const result = await pool.query(query);
            return parseInt(result.rows[0].count) || 0;
        } catch (error) {
            throw new Error(`Failed to get companies count: ${error.message}`);
        }
    }
}

module.exports = CompanyService; 