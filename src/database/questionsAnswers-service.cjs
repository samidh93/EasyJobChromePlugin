const QuestionsAnswers = require('./models/QuestionsAnswers.cjs');

class QuestionsAnswersService {
    // Create a new question-answer pair
    static async createQuestionAnswer(qaData) {
        try {
            const qa = await QuestionsAnswers.create(qaData);
            return qa.toJSON();
        } catch (error) {
            throw new Error(`Failed to create question-answer: ${error.message}`);
        }
    }

    // Get question-answer by ID
    static async getQuestionAnswerById(id) {
        try {
            const qa = await QuestionsAnswers.findById(id);
            return qa ? qa.toJSON() : null;
        } catch (error) {
            throw new Error(`Failed to get question-answer by ID: ${error.message}`);
        }
    }

    // Get all questions-answers for an application
    static async getQuestionAnswersByApplicationId(applicationId) {
        try {
            const qas = await QuestionsAnswers.findByApplicationId(applicationId);
            return qas.map(qa => qa.toJSON());
        } catch (error) {
            throw new Error(`Failed to get questions-answers by application ID: ${error.message}`);
        }
    }

    // Get questions-answers by question type
    static async getQuestionAnswersByType(questionType, applicationId = null) {
        try {
            const qas = await QuestionsAnswers.findByQuestionType(questionType, applicationId);
            return qas.map(qa => qa.toJSON());
        } catch (error) {
            throw new Error(`Failed to get questions-answers by type: ${error.message}`);
        }
    }

    // Get skipped questions
    static async getSkippedQuestions(applicationId = null) {
        try {
            const qas = await QuestionsAnswers.findSkipped(applicationId);
            return qas.map(qa => qa.toJSON());
        } catch (error) {
            throw new Error(`Failed to get skipped questions: ${error.message}`);
        }
    }

    // Get questions-answers by AI model
    static async getQuestionAnswersByAIModel(aiModel, applicationId = null) {
        try {
            const qas = await QuestionsAnswers.findByAIModel(aiModel, applicationId);
            return qas.map(qa => qa.toJSON());
        } catch (error) {
            throw new Error(`Failed to get questions-answers by AI model: ${error.message}`);
        }
    }

    // Get questions-answers with low confidence
    static async getLowConfidenceQuestions(threshold = 0.5, applicationId = null) {
        try {
            const qas = await QuestionsAnswers.findLowConfidence(threshold, applicationId);
            return qas.map(qa => qa.toJSON());
        } catch (error) {
            throw new Error(`Failed to get low confidence questions: ${error.message}`);
        }
    }

    // Update question-answer
    static async updateQuestionAnswer(id, updateData) {
        try {
            const qa = await QuestionsAnswers.findById(id);
            if (!qa) {
                throw new Error('Question-answer not found');
            }
            
            const updatedQA = await qa.update(updateData);
            return updatedQA.toJSON();
        } catch (error) {
            throw new Error(`Failed to update question-answer: ${error.message}`);
        }
    }

    // Update answer only
    static async updateAnswer(id, newAnswer, confidenceScore = null) {
        try {
            const qa = await QuestionsAnswers.findById(id);
            if (!qa) {
                throw new Error('Question-answer not found');
            }
            
            const updatedQA = await qa.updateAnswer(newAnswer, confidenceScore);
            return updatedQA.toJSON();
        } catch (error) {
            throw new Error(`Failed to update answer: ${error.message}`);
        }
    }

    // Mark question as skipped
    static async markQuestionSkipped(id) {
        try {
            const qa = await QuestionsAnswers.findById(id);
            if (!qa) {
                throw new Error('Question-answer not found');
            }
            
            const updatedQA = await qa.markSkipped();
            return updatedQA.toJSON();
        } catch (error) {
            throw new Error(`Failed to mark question as skipped: ${error.message}`);
        }
    }

    // Mark question as not skipped
    static async markQuestionNotSkipped(id) {
        try {
            const qa = await QuestionsAnswers.findById(id);
            if (!qa) {
                throw new Error('Question-answer not found');
            }
            
            const updatedQA = await qa.markNotSkipped();
            return updatedQA.toJSON();
        } catch (error) {
            throw new Error(`Failed to mark question as not skipped: ${error.message}`);
        }
    }

    // Get application details for a question-answer
    static async getApplicationForQuestionAnswer(id) {
        try {
            const qa = await QuestionsAnswers.findById(id);
            if (!qa) {
                throw new Error('Question-answer not found');
            }
            
            const application = await qa.getApplication();
            return application;
        } catch (error) {
            throw new Error(`Failed to get application for question-answer: ${error.message}`);
        }
    }

    // Search questions by text
    static async searchQuestions(searchTerm, applicationId = null, limit = 20) {
        try {
            const qas = await QuestionsAnswers.searchQuestions(searchTerm, applicationId, limit);
            return qas.map(qa => qa.toJSON());
        } catch (error) {
            throw new Error(`Failed to search questions: ${error.message}`);
        }
    }

    // Search answers by text
    static async searchAnswers(searchTerm, applicationId = null, limit = 20) {
        try {
            const qas = await QuestionsAnswers.searchAnswers(searchTerm, applicationId, limit);
            return qas.map(qa => qa.toJSON());
        } catch (error) {
            throw new Error(`Failed to search answers: ${error.message}`);
        }
    }

    // Get statistics for questions-answers
    static async getStats(applicationId = null) {
        try {
            const stats = await QuestionsAnswers.getStats(applicationId);
            return {
                total_questions: parseInt(stats.total_questions) || 0,
                skipped_questions: parseInt(stats.skipped_questions) || 0,
                answered_questions: parseInt(stats.answered_questions) || 0,
                avg_confidence: parseFloat(stats.avg_confidence) || 0,
                min_confidence: parseFloat(stats.min_confidence) || 0,
                max_confidence: parseFloat(stats.max_confidence) || 0,
                unique_question_types: parseInt(stats.unique_question_types) || 0,
                unique_ai_models: parseInt(stats.unique_ai_models) || 0
            };
        } catch (error) {
            throw new Error(`Failed to get questions-answers stats: ${error.message}`);
        }
    }

    // Get question types distribution
    static async getQuestionTypesStats(applicationId = null) {
        try {
            const stats = await QuestionsAnswers.getQuestionTypesStats(applicationId);
            return stats.map(stat => ({
                question_type: stat.question_type,
                count: parseInt(stat.count) || 0,
                avg_confidence: parseFloat(stat.avg_confidence) || 0,
                skipped_count: parseInt(stat.skipped_count) || 0
            }));
        } catch (error) {
            throw new Error(`Failed to get question types stats: ${error.message}`);
        }
    }

    // Get AI model performance stats
    static async getAIModelStats(applicationId = null) {
        try {
            const stats = await QuestionsAnswers.getAIModelStats(applicationId);
            return stats.map(stat => ({
                ai_model_used: stat.ai_model_used,
                questions_answered: parseInt(stat.questions_answered) || 0,
                avg_confidence: parseFloat(stat.avg_confidence) || 0,
                skipped_count: parseInt(stat.skipped_count) || 0
            }));
        } catch (error) {
            throw new Error(`Failed to get AI model stats: ${error.message}`);
        }
    }

    // Delete question-answer
    static async deleteQuestionAnswer(id) {
        try {
            const qa = await QuestionsAnswers.findById(id);
            if (!qa) {
                throw new Error('Question-answer not found');
            }
            
            await qa.delete();
            return { success: true, message: 'Question-answer deleted successfully' };
        } catch (error) {
            throw new Error(`Failed to delete question-answer: ${error.message}`);
        }
    }

    // Delete all questions-answers for an application
    static async deleteQuestionAnswersByApplicationId(applicationId) {
        try {
            const deletedCount = await QuestionsAnswers.deleteByApplicationId(applicationId);
            return { 
                success: true, 
                message: `Deleted ${deletedCount} question-answers for application ${applicationId}`,
                deleted_count: deletedCount
            };
        } catch (error) {
            throw new Error(`Failed to delete questions-answers by application ID: ${error.message}`);
        }
    }

    // Check if question-answer exists
    static async questionAnswerExists(id) {
        try {
            const qa = await QuestionsAnswers.findById(id);
            return qa !== null;
        } catch (error) {
            throw new Error(`Failed to check question-answer existence: ${error.message}`);
        }
    }

    // Get unique question types
    static async getUniqueQuestionTypes(applicationId = null) {
        try {
            const stats = await QuestionsAnswers.getQuestionTypesStats(applicationId);
            return stats.map(stat => stat.question_type);
        } catch (error) {
            throw new Error(`Failed to get unique question types: ${error.message}`);
        }
    }

    // Get unique AI models used
    static async getUniqueAIModels(applicationId = null) {
        try {
            const stats = await QuestionsAnswers.getAIModelStats(applicationId);
            return stats.map(stat => stat.ai_model_used);
        } catch (error) {
            throw new Error(`Failed to get unique AI models: ${error.message}`);
        }
    }

    // Get questions-answers count
    static async getQuestionAnswersCount(applicationId = null) {
        try {
            const stats = await QuestionsAnswers.getStats(applicationId);
            return parseInt(stats.total_questions) || 0;
        } catch (error) {
            throw new Error(`Failed to get questions-answers count: ${error.message}`);
        }
    }

    // Get recent questions-answers
    static async getRecentQuestionAnswers(limit = 10, applicationId = null) {
        try {
            let qas;
            if (applicationId) {
                qas = await QuestionsAnswers.findByApplicationId(applicationId);
            } else {
                // Get all recent questions across all applications
                const { pool } = require('./connection.cjs');
                const query = 'SELECT * FROM questions_answers ORDER BY created_at DESC LIMIT $1';
                const result = await pool.query(query, [limit]);
                qas = result.rows.map(row => new QuestionsAnswers(row));
            }
            
            return qas.slice(0, limit).map(qa => qa.toJSON());
        } catch (error) {
            throw new Error(`Failed to get recent questions-answers: ${error.message}`);
        }
    }
}

module.exports = QuestionsAnswersService; 