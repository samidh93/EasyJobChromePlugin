const { Resume } = require('./models/index.cjs');

class ResumeService {
    /**
     * Create a new resume
     * @param {Object} resumeData - Resume data
     * @param {string} resumeData.name - Resume name
     * @param {string} resumeData.extension - File extension
     * @param {string} resumeData.path - File path
     * @param {string} resumeData.short_description - Short description
     * @param {string} resumeData.user_id - User ID
     * @param {boolean} resumeData.is_default - Whether this is the default resume
     * @returns {Promise<Object>} Created resume object
     */
    static async createResume(resumeData) {
        try {
            const resume = await Resume.create(resumeData);
            return resume.toJSON ? resume.toJSON() : resume;
        } catch (error) {
            console.error('Error creating resume:', error);
            throw error;
        }
    }

    /**
     * Get resume by ID
     * @param {string} resumeId - Resume ID
     * @returns {Promise<Object|null>} Resume object or null
     */
    static async getResumeById(resumeId) {
        try {
            const resume = await Resume.findById(resumeId);
            return resume ? (resume.toJSON ? resume.toJSON() : resume) : null;
        } catch (error) {
            console.error('Error getting resume by ID:', error);
            throw error;
        }
    }

    /**
     * Get all resumes for a user
     * @param {string} userId - User ID
     * @returns {Promise<Array>} Array of resume objects
     */
    static async getResumesByUserId(userId) {
        try {
            const resumes = await Resume.findByUserId(userId);
            return resumes.map(resume => resume.toJSON ? resume.toJSON() : resume);
        } catch (error) {
            console.error('Error getting resumes by user ID:', error);
            throw error;
        }
    }

    /**
     * Get default resume for a user
     * @param {string} userId - User ID
     * @returns {Promise<Object|null>} Default resume or null
     */
    static async getDefaultResumeByUserId(userId) {
        try {
            const resume = await Resume.findDefaultByUserId(userId);
            return resume ? (resume.toJSON ? resume.toJSON() : resume) : null;
        } catch (error) {
            console.error('Error getting default resume by user ID:', error);
            throw error;
        }
    }

    /**
     * Update a resume
     * @param {string} resumeId - Resume ID
     * @param {Object} updateData - Data to update
     * @returns {Promise<Object>} Updated resume object
     */
    static async updateResume(resumeId, updateData) {
        try {
            const resume = await Resume.findById(resumeId);
            if (!resume) {
                throw new Error('Resume not found');
            }

            const updatedResume = await resume.update(updateData);
            return updatedResume.toJSON ? updatedResume.toJSON() : updatedResume;
        } catch (error) {
            console.error('Error updating resume:', error);
            throw error;
        }
    }

    /**
     * Set a resume as default (unsets other defaults for the user)
     * @param {string} resumeId - Resume ID
     * @returns {Promise<Object>} Updated resume object
     */
    static async setResumeAsDefault(resumeId) {
        try {
            const resume = await Resume.findById(resumeId);
            if (!resume) {
                throw new Error('Resume not found');
            }

            const updatedResume = await resume.setAsDefault();
            return updatedResume.toJSON ? updatedResume.toJSON() : updatedResume;
        } catch (error) {
            console.error('Error setting resume as default:', error);
            throw error;
        }
    }

    /**
     * Unset all other resumes as default for a user
     * @param {string} userId - User ID
     * @returns {Promise<boolean>} Success status
     */
    static async unsetOtherResumesAsDefault(userId) {
        try {
            const { pool } = require('./connection.cjs');
            await pool.query(
                'UPDATE resume SET is_default = false WHERE user_id = $1',
                [userId]
            );
            return true;
        } catch (error) {
            console.error('Error unsetting other resumes as default:', error);
            throw error;
        }
    }

    /**
     * Delete a resume
     * @param {string} resumeId - Resume ID
     * @returns {Promise<boolean>} Success status
     */
    static async deleteResume(resumeId) {
        try {
            const resume = await Resume.findById(resumeId);
            if (!resume) {
                throw new Error('Resume not found');
            }

            const result = await resume.delete();
            return result;
        } catch (error) {
            console.error('Error deleting resume:', error);
            throw error;
        }
    }

    /**
     * Check if a resume can be deleted (not used in applications)
     * @param {string} resumeId - Resume ID
     * @returns {Promise<boolean>} True if can be deleted
     */
    static async canDeleteResume(resumeId) {
        try {
            const resume = await Resume.findById(resumeId);
            if (!resume) {
                throw new Error('Resume not found');
            }

            return await resume.canDelete();
        } catch (error) {
            console.error('Error checking if resume can be deleted:', error);
            throw error;
        }
    }

    /**
     * Get applications that used a specific resume
     * @param {string} resumeId - Resume ID
     * @returns {Promise<Array>} Array of application objects
     */
    static async getResumeApplications(resumeId) {
        try {
            const resume = await Resume.findById(resumeId);
            if (!resume) {
                throw new Error('Resume not found');
            }

            return await resume.getApplications();
        } catch (error) {
            console.error('Error getting resume applications:', error);
            throw error;
        }
    }

    /**
     * Get resume statistics
     * @param {string} userId - Optional user ID to filter stats
     * @returns {Promise<Object>} Resume statistics
     */
    static async getResumeStats(userId = null) {
        try {
            const stats = await Resume.getStats(userId);
            
            // Convert string numbers to integers
            return {
                total_resumes: parseInt(stats.total_resumes) || 0,
                default_resumes: parseInt(stats.default_resumes) || 0,
                unique_extensions: parseInt(stats.unique_extensions) || 0
            };
        } catch (error) {
            console.error('Error getting resume stats:', error);
            throw error;
        }
    }

    /**
     * Get global resume statistics (for admin purposes)
     * @returns {Promise<Object>} Global resume statistics
     */
    static async getGlobalResumeStats() {
        try {
            const { pool } = require('./connection.cjs');
            const query = `
                SELECT 
                    COUNT(*) as total_resumes,
                    COUNT(DISTINCT user_id) as total_users_with_resumes,
                    array_agg(DISTINCT extension) as file_types
                FROM resume
            `;
            
            const result = await pool.query(query);
            const stats = result.rows[0];
            
            return {
                total_resumes: parseInt(stats.total_resumes) || 0,
                total_users_with_resumes: parseInt(stats.total_users_with_resumes) || 0,
                file_types: stats.file_types || []
            };
        } catch (error) {
            console.error('Error getting global resume stats:', error);
            throw error;
        }
    }

    /**
     * Find resumes by extension
     * @param {string} extension - File extension
     * @param {string} userId - Optional user ID to filter
     * @returns {Promise<Array>} Array of resume objects
     */
    static async getResumesByExtension(extension, userId = null) {
        try {
            const resumes = await Resume.findByExtension(extension, userId);
            return resumes.map(resume => resume.toJSON ? resume.toJSON() : resume);
        } catch (error) {
            console.error('Error getting resumes by extension:', error);
            throw error;
        }
    }

    /**
     * Validate resume data
     * @param {Object} resumeData - Resume data to validate
     * @returns {Object} Validation result
     */
    static validateResumeData(resumeData) {
        const errors = [];

        if (!resumeData.name || resumeData.name.trim().length < 1) {
            errors.push('Resume name is required');
        }

        if (!resumeData.extension) {
            errors.push('File extension is required');
        }

        if (!resumeData.path) {
            errors.push('File path is required');
        }

        if (!resumeData.user_id) {
            errors.push('User ID is required');
        }

        const allowedExtensions = ['.pdf', '.doc', '.docx', '.txt', '.yaml', '.yml', '.json'];
        if (resumeData.extension && !allowedExtensions.includes(resumeData.extension.toLowerCase())) {
            errors.push(`Invalid file extension. Allowed: ${allowedExtensions.join(', ')}`);
        }

        return {
            isValid: errors.length === 0,
            errors
        };
    }

    /**
     * Check if user exists (helper method)
     * @param {string} userId - User ID
     * @returns {Promise<boolean>} True if user exists
     */
    static async userExists(userId) {
        try {
            const { User } = require('./models/index.cjs');
            const user = await User.findById(userId);
            return !!user;
        } catch (error) {
            console.error('Error checking if user exists:', error);
            return false;
        }
    }
}

module.exports = ResumeService; 