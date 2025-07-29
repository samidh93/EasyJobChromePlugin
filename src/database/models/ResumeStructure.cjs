const { pool } = require('../connection.cjs');

class ResumeStructure {
    constructor(resumeStructureData) {
        this.id = resumeStructureData.id;
        this.resume_id = resumeStructureData.resume_id;
        this.personal_info = resumeStructureData.personal_info || {};
        this.summary = resumeStructureData.summary || {};
        this.experiences = resumeStructureData.experiences || [];
        this.educations = resumeStructureData.educations || [];
        this.skills = resumeStructureData.skills || {};
        this.languages = resumeStructureData.languages || [];
        this.projects = resumeStructureData.projects || [];
        this.certifications = resumeStructureData.certifications || [];
        this.interests = resumeStructureData.interests || [];
        this.created_at = resumeStructureData.created_at;
        this.updated_at = resumeStructureData.updated_at;
    }

    // Create a new resume structure
    static async create(resumeStructureData) {
        const query = `
            INSERT INTO resume_structure (
                resume_id, personal_info, summary, experiences, educations, 
                skills, languages, projects, certifications, interests
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
            RETURNING *
        `;
        const values = [
            resumeStructureData.resume_id,
            JSON.stringify(resumeStructureData.personal_info || {}),
            JSON.stringify(resumeStructureData.summary || {}),
            JSON.stringify(resumeStructureData.experiences || []),
            JSON.stringify(resumeStructureData.educations || []),
            JSON.stringify(resumeStructureData.skills || {}),
            JSON.stringify(resumeStructureData.languages || []),
            JSON.stringify(resumeStructureData.projects || []),
            JSON.stringify(resumeStructureData.certifications || []),
            JSON.stringify(resumeStructureData.interests || [])
        ];

        try {
            const result = await pool.query(query, values);
            return new ResumeStructure(result.rows[0]);
        } catch (error) {
            throw new Error(`Failed to create resume structure: ${error.message}`);
        }
    }

    // Find resume structure by resume ID
    static async findByResumeId(resumeId) {
        const query = 'SELECT * FROM resume_structure WHERE resume_id = $1';
        try {
            const result = await pool.query(query, [resumeId]);
            return result.rows[0] ? new ResumeStructure(result.rows[0]) : null;
        } catch (error) {
            throw new Error(`Failed to find resume structure by resume ID: ${error.message}`);
        }
    }

    // Find resume structure by ID
    static async findById(id) {
        const query = 'SELECT * FROM resume_structure WHERE id = $1';
        try {
            const result = await pool.query(query, [id]);
            return result.rows[0] ? new ResumeStructure(result.rows[0]) : null;
        } catch (error) {
            throw new Error(`Failed to find resume structure by ID: ${error.message}`);
        }
    }

    // Find resume structures by user ID
    static async findByUserId(userId) {
        const query = `
            SELECT rs.* 
            FROM resume_structure rs
            JOIN resume r ON rs.resume_id = r.id
            WHERE r.user_id = $1
            ORDER BY r.is_default DESC, r.creation_date DESC
        `;
        try {
            const result = await pool.query(query, [userId]);
            return result.rows.map(row => new ResumeStructure(row));
        } catch (error) {
            throw new Error(`Failed to find resume structures by user ID: ${error.message}`);
        }
    }

    // Update resume structure data
    async update(updateData) {
        const fields = [];
        const values = [];
        let paramCount = 1;

        // Build dynamic update query
        for (const [key, value] of Object.entries(updateData)) {
            if (key !== 'id' && value !== undefined) {
                if (typeof value === 'object') {
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
            UPDATE resume_structure 
            SET ${fields.join(', ')}, updated_at = NOW()
            WHERE id = $${paramCount}
            RETURNING *
        `;
        values.push(this.id);

        try {
            const result = await pool.query(query, values);
            const updatedResumeStructure = new ResumeStructure(result.rows[0]);
            Object.assign(this, updatedResumeStructure);
            return this;
        } catch (error) {
            throw new Error(`Failed to update resume structure: ${error.message}`);
        }
    }

    // Delete resume structure
    async delete() {
        const query = 'DELETE FROM resume_structure WHERE id = $1 RETURNING *';
        try {
            const result = await pool.query(query, [this.id]);
            return result.rows[0] ? new ResumeStructure(result.rows[0]) : null;
        } catch (error) {
            throw new Error(`Failed to delete resume structure: ${error.message}`);
        }
    }

    // Get skills for a specific technology
    getSkillInfo(technology) {
        if (!this.skills) return null;
        
        // Search through all skill categories
        for (const [category, skills] of Object.entries(this.skills)) {
            if (skills[technology]) {
                return {
                    category,
                    ...skills[technology]
                };
            }
        }
        return null;
    }

    // Get experience for a specific technology
    getExperienceInfo(technology) {
        if (!this.experiences) return [];
        
        return this.experiences.filter(exp => {
            // Check if technology is mentioned in responsibilities or skills acquired
            const responsibilities = exp.responsibilities?.join(' ') || '';
            const skillsAcquired = exp.skills_acquired?.join(' ') || '';
            const searchText = `${responsibilities} ${skillsAcquired}`.toLowerCase();
            return searchText.includes(technology.toLowerCase());
        });
    }

    // Get relevant information for a question type
    getRelevantInfo(questionType) {
        switch (questionType.toLowerCase()) {
            case 'skills':
            case 'experience':
            case 'technology':
                return {
                    skills: this.skills,
                    experiences: this.experiences
                };
            case 'education':
                return {
                    educations: this.educations
                };
            case 'personal':
            case 'contact':
                return {
                    personal_info: this.personal_info
                };
            case 'languages':
                return {
                    languages: this.languages
                };
            case 'projects':
                return {
                    projects: this.projects
                };
            case 'certifications':
                return {
                    certifications: this.certifications
                };
            default:
                return {
                    personal_info: this.personal_info,
                    summary: this.summary,
                    experiences: this.experiences,
                    skills: this.skills
                };
        }
    }

    // Convert to JSON (for consistent serialization)
    toJSON() {
        return {
            id: this.id,
            resume_id: this.resume_id,
            personal_info: this.personal_info,
            summary: this.summary,
            experiences: this.experiences,
            educations: this.educations,
            skills: this.skills,
            languages: this.languages,
            projects: this.projects,
            certifications: this.certifications,
            interests: this.interests,
            created_at: this.created_at,
            updated_at: this.updated_at
        };
    }
}

module.exports = ResumeStructure; 