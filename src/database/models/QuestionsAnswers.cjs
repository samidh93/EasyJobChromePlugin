const { pool } = require('../connection.cjs');

class QuestionsAnswers {
    constructor(qaData) {
        this.id = qaData.id;
        this.application_id = qaData.application_id;
        this.question = qaData.question;
        this.answer = qaData.answer;
        this.question_type = qaData.question_type;
        this.ai_model_used = qaData.ai_model_used;
        this.confidence_score = qaData.confidence_score;
        this.is_skipped = qaData.is_skipped;
        this.created_at = qaData.created_at;
    }

    // Create a new question-answer pair
    static async create(qaData) {
        const query = `
            INSERT INTO questions_answers (application_id, question, answer, question_type, 
                                         ai_model_used, confidence_score, is_skipped)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING *
        `;
        const values = [
            qaData.application_id,
            qaData.question,
            qaData.answer,
            qaData.question_type,
            qaData.ai_model_used,
            qaData.confidence_score,
            qaData.is_skipped || false
        ];

        try {
            const result = await pool.query(query, values);
            return new QuestionsAnswers(result.rows[0]);
        } catch (error) {
            throw new Error(`Failed to create question-answer: ${error.message}`);
        }
    }

    // Find question-answer by ID
    static async findById(id) {
        const query = 'SELECT * FROM questions_answers WHERE id = $1';
        try {
            const result = await pool.query(query, [id]);
            return result.rows[0] ? new QuestionsAnswers(result.rows[0]) : null;
        } catch (error) {
            throw new Error(`Failed to find question-answer by ID: ${error.message}`);
        }
    }

    // Find all questions-answers for an application
    static async findByApplicationId(applicationId) {
        const query = 'SELECT * FROM questions_answers WHERE application_id = $1 ORDER BY created_at ASC';
        try {
            const result = await pool.query(query, [applicationId]);
            return result.rows.map(row => new QuestionsAnswers(row));
        } catch (error) {
            throw new Error(`Failed to find questions-answers by application ID: ${error.message}`);
        }
    }

    // Find questions-answers by question type
    static async findByQuestionType(questionType, applicationId = null) {
        let query = 'SELECT * FROM questions_answers WHERE question_type = $1';
        const values = [questionType];

        if (applicationId) {
            query += ' AND application_id = $2';
            values.push(applicationId);
        }

        query += ' ORDER BY created_at DESC';

        try {
            const result = await pool.query(query, values);
            return result.rows.map(row => new QuestionsAnswers(row));
        } catch (error) {
            throw new Error(`Failed to find questions-answers by type: ${error.message}`);
        }
    }

    // Find skipped questions
    static async findSkipped(applicationId = null) {
        let query = 'SELECT * FROM questions_answers WHERE is_skipped = true';
        const values = [];

        if (applicationId) {
            query += ' AND application_id = $1';
            values.push(applicationId);
        }

        query += ' ORDER BY created_at DESC';

        try {
            const result = await pool.query(query, values);
            return result.rows.map(row => new QuestionsAnswers(row));
        } catch (error) {
            throw new Error(`Failed to find skipped questions: ${error.message}`);
        }
    }

    // Find questions-answers by AI model
    static async findByAIModel(aiModel, applicationId = null) {
        let query = 'SELECT * FROM questions_answers WHERE ai_model_used = $1';
        const values = [aiModel];

        if (applicationId) {
            query += ' AND application_id = $2';
            values.push(applicationId);
        }

        query += ' ORDER BY created_at DESC';

        try {
            const result = await pool.query(query, values);
            return result.rows.map(row => new QuestionsAnswers(row));
        } catch (error) {
            throw new Error(`Failed to find questions-answers by AI model: ${error.message}`);
        }
    }

    // Find questions-answers with low confidence
    static async findLowConfidence(threshold = 0.5, applicationId = null) {
        let query = 'SELECT * FROM questions_answers WHERE confidence_score < $1';
        const values = [threshold];

        if (applicationId) {
            query += ' AND application_id = $2';
            values.push(applicationId);
        }

        query += ' ORDER BY confidence_score ASC';

        try {
            const result = await pool.query(query, values);
            return result.rows.map(row => new QuestionsAnswers(row));
        } catch (error) {
            throw new Error(`Failed to find low confidence questions: ${error.message}`);
        }
    }

    // Update question-answer
    async update(updateData) {
        const fields = [];
        const values = [];
        let paramCount = 1;

        // Build dynamic update query
        for (const [key, value] of Object.entries(updateData)) {
            if (key !== 'id' && key !== 'created_at' && value !== undefined) {
                fields.push(`${key} = $${paramCount}`);
                values.push(value);
                paramCount++;
            }
        }

        if (fields.length === 0) {
            throw new Error('No fields to update');
        }

        const query = `
            UPDATE questions_answers 
            SET ${fields.join(', ')} 
            WHERE id = $${paramCount}
            RETURNING *
        `;
        values.push(this.id);

        try {
            const result = await pool.query(query, values);
            const updatedQA = new QuestionsAnswers(result.rows[0]);
            Object.assign(this, updatedQA);
            return this;
        } catch (error) {
            throw new Error(`Failed to update question-answer: ${error.message}`);
        }
    }

    // Update answer only
    async updateAnswer(newAnswer, confidenceScore = null) {
        const updateData = { answer: newAnswer };
        if (confidenceScore !== null) {
            updateData.confidence_score = confidenceScore;
        }
        return this.update(updateData);
    }

    // Mark as skipped
    async markSkipped() {
        return this.update({ is_skipped: true });
    }

    // Mark as not skipped
    async markNotSkipped() {
        return this.update({ is_skipped: false });
    }

    // Get application details for this question-answer
    async getApplication() {
        const query = `
            SELECT a.*, j.title as job_title, c.name as company_name
            FROM applications a
            JOIN jobs j ON a.job_id = j.id
            JOIN companies c ON j.company_id = c.id
            WHERE a.id = $1
        `;
        try {
            const result = await pool.query(query, [this.application_id]);
            return result.rows[0] || null;
        } catch (error) {
            throw new Error(`Failed to get application for question-answer: ${error.message}`);
        }
    }

    // Search questions by text
    static async searchQuestions(searchTerm, applicationId = null, limit = 20) {
        let query = `
            SELECT * FROM questions_answers 
            WHERE to_tsvector('english', question) @@ plainto_tsquery('english', $1)
        `;
        const values = [searchTerm];

        if (applicationId) {
            query += ' AND application_id = $2';
            values.push(applicationId);
        }

        query += ' ORDER BY created_at DESC LIMIT $' + (values.length + 1);
        values.push(limit);

        try {
            const result = await pool.query(query, values);
            return result.rows.map(row => new QuestionsAnswers(row));
        } catch (error) {
            throw new Error(`Failed to search questions: ${error.message}`);
        }
    }

    // Search answers by text
    static async searchAnswers(searchTerm, applicationId = null, limit = 20) {
        let query = `
            SELECT * FROM questions_answers 
            WHERE to_tsvector('english', answer) @@ plainto_tsquery('english', $1)
        `;
        const values = [searchTerm];

        if (applicationId) {
            query += ' AND application_id = $2';
            values.push(applicationId);
        }

        query += ' ORDER BY created_at DESC LIMIT $' + (values.length + 1);
        values.push(limit);

        try {
            const result = await pool.query(query, values);
            return result.rows.map(row => new QuestionsAnswers(row));
        } catch (error) {
            throw new Error(`Failed to search answers: ${error.message}`);
        }
    }

    // Get statistics for questions-answers
    static async getStats(applicationId = null) {
        let query = `
            SELECT 
                COUNT(*) as total_questions,
                COUNT(CASE WHEN is_skipped = true THEN 1 END) as skipped_questions,
                COUNT(CASE WHEN is_skipped = false THEN 1 END) as answered_questions,
                AVG(confidence_score) as avg_confidence,
                MIN(confidence_score) as min_confidence,
                MAX(confidence_score) as max_confidence,
                COUNT(DISTINCT question_type) as unique_question_types,
                COUNT(DISTINCT ai_model_used) as unique_ai_models
            FROM questions_answers
        `;
        const values = [];

        if (applicationId) {
            query += ' WHERE application_id = $1';
            values.push(applicationId);
        }

        try {
            const result = await pool.query(query, values);
            return result.rows[0];
        } catch (error) {
            throw new Error(`Failed to get questions-answers stats: ${error.message}`);
        }
    }

    // Get question types distribution
    static async getQuestionTypesStats(applicationId = null) {
        let query = `
            SELECT 
                question_type,
                COUNT(*) as count,
                AVG(confidence_score) as avg_confidence,
                COUNT(CASE WHEN is_skipped = true THEN 1 END) as skipped_count
            FROM questions_answers
        `;
        const values = [];

        if (applicationId) {
            query += ' WHERE application_id = $1';
            values.push(applicationId);
        }

        query += ' GROUP BY question_type ORDER BY count DESC';

        try {
            const result = await pool.query(query, values);
            return result.rows;
        } catch (error) {
            throw new Error(`Failed to get question types stats: ${error.message}`);
        }
    }

    // Get AI model performance stats
    static async getAIModelStats(applicationId = null) {
        let query = `
            SELECT 
                ai_model_used,
                COUNT(*) as questions_answered,
                AVG(confidence_score) as avg_confidence,
                COUNT(CASE WHEN is_skipped = true THEN 1 END) as skipped_count
            FROM questions_answers
            WHERE ai_model_used IS NOT NULL
        `;
        const values = [];

        if (applicationId) {
            query += ' AND application_id = $1';
            values.push(applicationId);
        }

        query += ' GROUP BY ai_model_used ORDER BY questions_answered DESC';

        try {
            const result = await pool.query(query, values);
            return result.rows;
        } catch (error) {
            throw new Error(`Failed to get AI model stats: ${error.message}`);
        }
    }

    // Delete question-answer
    async delete() {
        const query = 'DELETE FROM questions_answers WHERE id = $1';
        try {
            await pool.query(query, [this.id]);
            return true;
        } catch (error) {
            throw new Error(`Failed to delete question-answer: ${error.message}`);
        }
    }

    // Delete all questions-answers for an application
    static async deleteByApplicationId(applicationId) {
        const query = 'DELETE FROM questions_answers WHERE application_id = $1';
        try {
            const result = await pool.query(query, [applicationId]);
            return result.rowCount;
        } catch (error) {
            throw new Error(`Failed to delete questions-answers by application ID: ${error.message}`);
        }
    }

    // Convert to JSON for API responses
    toJSON() {
        return {
            id: this.id,
            application_id: this.application_id,
            question: this.question,
            answer: this.answer,
            question_type: this.question_type,
            ai_model_used: this.ai_model_used,
            confidence_score: this.confidence_score,
            is_skipped: this.is_skipped,
            created_at: this.created_at
        };
    }
}

module.exports = QuestionsAnswers; 