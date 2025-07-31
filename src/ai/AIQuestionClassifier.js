/**
 * AI Question Classifier
 * Uses AI to classify job application questions and extract relevant keywords
 */
class AIQuestionClassifier {
    constructor(aiSettingsManager) {
        this.aiSettingsManager = aiSettingsManager;
        this.classificationCache = new Map(); // Cache classifications to avoid redundant AI calls
    }

    /**
     * Classify a question using AI and extract relevant keywords
     * @param {string} question - The question to classify
     * @returns {Promise<Object>} Classification result
     */
    async classifyQuestion(question) {
        // Check cache first
        const cacheKey = question.toLowerCase().trim();
        if (this.classificationCache.has(cacheKey)) {
            console.log('AIQuestionClassifier: Using cached classification');
            return this.classificationCache.get(cacheKey);
        }

        try {
            const classificationPrompt = this.buildClassificationPrompt(question);
            
            console.log('AIQuestionClassifier: Classifying question with AI');
            
            const response = await this.aiSettingsManager.callAI({
                prompt: classificationPrompt,
                max_tokens: 200,
                temperature: 0.1, // Low temperature for consistent classifications
                stream: false
            });

            let result = this.parseClassificationResponse(response);
            
            // Validate and set defaults if needed
            result = this.validateClassification(result, question);
            
            // Cache the result
            this.classificationCache.set(cacheKey, result);
            
            console.log('AIQuestionClassifier: Classification result:', result);
            return result;
            
        } catch (error) {
            console.error('AIQuestionClassifier: Error classifying question:', error);
            // Return fallback classification
            return this.getFallbackClassification(question);
        }
    }

    /**
     * Build the AI prompt for question classification
     * @param {string} question - The question to classify
     * @returns {string} Classification prompt
     */
    buildClassificationPrompt(question) {
        return `You are an expert at analyzing job application questions. Classify the following question and extract relevant keywords.

QUESTION: "${question}"

Analyze and return ONLY a JSON object with these fields:
{
  "question_type": "one of: language_proficiency|skill_level|years_experience|education|personal|salary|availability|notice_period|visa_status|general",
  "keywords": ["array", "of", "relevant", "keywords"],
  "confidence": 0.95,
  "language": "en|de|fr|es",
  "expected_format": "text|number|selection|boolean"
}

CLASSIFICATION RULES:
- language_proficiency: Questions about language skills (German, English, etc.)
- skill_level: Questions about proficiency in technologies/tools
- years_experience: Questions asking for number of years of experience
- education: Questions about degrees, universities, graduation
- personal: Questions about name, contact, location, citizenship
- salary: Questions about salary expectations or current salary
- availability: Questions about start date, availability
- notice_period: Questions about notice period or current employment
- visa_status: Questions about visa, work permit, citizenship
- general: Any other questions

KEYWORD EXTRACTION:
- Extract specific technologies, languages, skills mentioned
- Normalize to common terms (e.g., "JS" → "JavaScript", "Deutsch" → "German")
- Include variations and synonyms

EXAMPLES:
Q: "Wie gut beherrschen Sie Deutsch?" → {"question_type":"language_proficiency","keywords":["German"],"confidence":0.95,"language":"de","expected_format":"selection"}
Q: "How many years of experience do you have with Python?" → {"question_type":"years_experience","keywords":["Python"],"confidence":0.9,"language":"en","expected_format":"number"}
Q: "What is your proficiency level in SAP?" → {"question_type":"skill_level","keywords":["SAP"],"confidence":0.9,"language":"en","expected_format":"selection"}

Return ONLY the JSON object:`;
    }

    /**
     * Parse the AI response and extract classification data
     * @param {Object} response - AI response
     * @returns {Object} Parsed classification
     */
    parseClassificationResponse(response) {
        try {
            // Handle different AI provider response formats
            let responseText = "";
            if (response?.response) {
                // Ollama format
                responseText = response.response.trim();
            } else if (response?.choices?.[0]?.message?.content) {
                // OpenAI format
                responseText = response.choices[0].message.content.trim();
            } else {
                throw new Error('Unexpected AI response format');
            }

            // Try to extract JSON from response
            const jsonMatch = responseText.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                return JSON.parse(jsonMatch[0]);
            } else {
                throw new Error('No JSON found in response');
            }
        } catch (error) {
            console.error('AIQuestionClassifier: Error parsing classification response:', error);
            throw error;
        }
    }

    /**
     * Validate classification result and apply defaults
     * @param {Object} result - Classification result
     * @param {string} question - Original question
     * @returns {Object} Validated classification
     */
    validateClassification(result, question) {
        const validTypes = [
            'language_proficiency', 'skill_level', 'years_experience', 
            'education', 'personal', 'salary', 'availability', 
            'notice_period', 'visa_status', 'general'
        ];

        return {
            question_type: validTypes.includes(result.question_type) ? result.question_type : 'general',
            keywords: Array.isArray(result.keywords) ? result.keywords : [],
            confidence: typeof result.confidence === 'number' ? result.confidence : 0.5,
            language: result.language || 'en',
            expected_format: result.expected_format || 'text'
        };
    }

    /**
     * Get fallback classification when AI fails
     * @param {string} question - The question
     * @returns {Object} Fallback classification
     */
    getFallbackClassification(question) {
        const questionLower = question.toLowerCase();
        
        // Simple keyword-based fallback
        if (questionLower.includes('deutsch') || questionLower.includes('german') || 
            questionLower.includes('english') || questionLower.includes('sprache') ||
            questionLower.includes('language')) {
            return {
                question_type: 'language_proficiency',
                keywords: this.extractLanguageKeywords(questionLower),
                confidence: 0.7,
                language: questionLower.includes('deutsch') ? 'de' : 'en',
                expected_format: 'selection'
            };
        }

        if (questionLower.includes('jahr') || questionLower.includes('year') || 
            questionLower.includes('erfahrung') || questionLower.includes('experience')) {
            return {
                question_type: 'years_experience',
                keywords: [],
                confidence: 0.6,
                language: questionLower.includes('jahr') ? 'de' : 'en',
                expected_format: 'number'
            };
        }

        return {
            question_type: 'general',
            keywords: [],
            confidence: 0.3,
            language: 'en',
            expected_format: 'text'
        };
    }

    /**
     * Extract language keywords from text
     * @param {string} text - Text to search
     * @returns {Array} Language keywords found
     */
    extractLanguageKeywords(text) {
        const languageMap = {
            'deutsch': 'German',
            'german': 'German',
            'english': 'English',
            'englisch': 'English',
            'french': 'French',
            'französisch': 'French',
            'spanish': 'Spanish',
            'spanisch': 'Spanish',
            'arabic': 'Arabic',
            'arabisch': 'Arabic'
        };

        const keywords = [];
        for (const [key, value] of Object.entries(languageMap)) {
            if (text.includes(key)) {
                keywords.push(value);
            }
        }
        return keywords;
    }

    /**
     * Clear classification cache
     */
    clearCache() {
        this.classificationCache.clear();
        console.log('AIQuestionClassifier: Cache cleared');
    }

    /**
     * Get cache statistics
     * @returns {Object} Cache stats
     */
    getCacheStats() {
        return {
            size: this.classificationCache.size,
            keys: Array.from(this.classificationCache.keys())
        };
    }
}

export default AIQuestionClassifier; 