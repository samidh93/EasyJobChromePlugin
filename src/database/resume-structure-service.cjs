const { pool } = require('./connection.cjs');

class ResumeStructureService {
    /**
     * Save structured resume data to database
     * @param {string} resumeId - Resume ID
     * @param {Object} structuredData - Structured resume data
     * @returns {Promise<Object>} - Result object
     */
    async saveResumeStructure(resumeId, structuredData) {
        const client = await pool.connect();
        try {
            await client.query('BEGIN');
            
            // Check if structure already exists
            const existing = await client.query(
                'SELECT id FROM resume_structure WHERE resume_id = $1',
                [resumeId]
            );
            
            if (existing.rows.length > 0) {
                // Update existing
                await client.query(`
                    UPDATE resume_structure SET
                        personal_info = $1,
                        summary = $2,
                        experiences = $3,
                        educations = $4,
                        skills = $5,
                        languages = $6,
                        projects = $7,
                        certifications = $8,
                        interests = $9,
                        updated_at = NOW()
                    WHERE resume_id = $10
                `, [
                    JSON.stringify(structuredData.personal_info || {}),
                    JSON.stringify(structuredData.summary || {}),
                    JSON.stringify(structuredData.experiences || []),
                    JSON.stringify(structuredData.educations || []),
                    JSON.stringify(structuredData.skills || []),
                    JSON.stringify(structuredData.languages || []),
                    JSON.stringify(structuredData.projects || []),
                    JSON.stringify(structuredData.certifications || []),
                    JSON.stringify(structuredData.interests || []),
                    resumeId
                ]);
                
                console.log(`Updated resume structure for resume ID: ${resumeId}`);
            } else {
                // Insert new
                await client.query(`
                    INSERT INTO resume_structure (
                        resume_id, personal_info, summary, experiences, educations,
                        skills, languages, projects, certifications, interests
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
                `, [
                    resumeId,
                    JSON.stringify(structuredData.personal_info || {}),
                    JSON.stringify(structuredData.summary || {}),
                    JSON.stringify(structuredData.experiences || []),
                    JSON.stringify(structuredData.educations || []),
                    JSON.stringify(structuredData.skills || []),
                    JSON.stringify(structuredData.languages || []),
                    JSON.stringify(structuredData.projects || []),
                    JSON.stringify(structuredData.certifications || []),
                    JSON.stringify(structuredData.interests || [])
                ]);
                
                console.log(`Created new resume structure for resume ID: ${resumeId}`);
            }
            
            await client.query('COMMIT');
            return { success: true };
        } catch (error) {
            await client.query('ROLLBACK');
            console.error('Error saving resume structure:', error);
            throw error;
        } finally {
            client.release();
        }
    }

    /**
     * Get resume structure by resume ID
     * @param {string} resumeId - Resume ID
     * @returns {Promise<Object|null>} - Resume structure data
     */
    async getResumeStructure(resumeId) {
        try {
            const result = await pool.query(
                'SELECT * FROM resume_structure WHERE resume_id = $1',
                [resumeId]
            );
            return result.rows[0] || null;
        } catch (error) {
            console.error('Error getting resume structure:', error);
            throw error;
        }
    }

    /**
     * Get relevant data based on question type (similar to Python script)
     * @param {string} resumeId - Resume ID
     * @param {string} questionType - Type of question
     * @returns {Promise<Object|null>} - Relevant data
     */
    async getRelevantData(resumeId, questionType) {
        try {
            console.log(`[DB SERVICE] getRelevantData called - resumeId: ${resumeId}, questionType: ${questionType}`);
            
            const structure = await this.getResumeStructure(resumeId);
            if (!structure) return null;

            console.log(`[DB SERVICE] Switch statement with questionType: "${questionType}"`);
            
            switch (questionType) {
                case 'language_level':
                case 'languages':
                case 'language_proficiency':
                    console.log(`[DB SERVICE] Matched language case, returning languages:`, structure.languages ? 'found' : 'not found');
                    return { languages: structure.languages || [] };
                
                case 'skills':
                case 'experience':
                case 'skill_level':
                case 'years_experience':
                    return {
                        skills: structure.skills || [],
                        experiences: structure.experiences || [],
                        personal_info: structure.personal_info || {}
                    };
                
                case 'education':
                    return { educations: structure.educations || [] };
                
                case 'personal':
                case 'visa':
                case 'salary':
                case 'visa_status':
                case 'availability':
                case 'notice_period':
                    return { personal_info: structure.personal_info || {} };
                
                case 'certifications':
                    return { certifications: structure.certifications || [] };
                
                case 'notice':
                    return {}; // No specific data needed
                
                default:
                    console.log(`[DB SERVICE] Hit default case for questionType: "${questionType}"`);
                    return {
                        personal_info: structure.personal_info || {},
                        summary: structure.summary || {},
                        experiences: structure.experiences || [],
                        skills: structure.skills || []
                    };
            }
        } catch (error) {
            console.error('Error getting relevant data:', error);
            throw error;
        }
    }

    /**
     * Delete resume structure
     * @param {string} resumeId - Resume ID
     * @returns {Promise<Object>} - Result object
     */
    async deleteResumeStructure(resumeId) {
        try {
            const result = await pool.query(
                'DELETE FROM resume_structure WHERE resume_id = $1',
                [resumeId]
            );
            return { success: true, deleted: result.rowCount > 0 };
        } catch (error) {
            console.error('Error deleting resume structure:', error);
            throw error;
        }
    }
}

module.exports = new ResumeStructureService(); 