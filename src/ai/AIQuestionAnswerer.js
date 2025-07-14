import AISettingsManager from './AISettingsManager.js';

class AIQuestionAnswerer {
    constructor(userId = null) {
        this.userId = userId;
        this.user_data = null;
        this.formatted_text = null;
        this.aiSettingsManager = new AISettingsManager();
        this.settingsLoadPromise = null;
        
        // Load AI settings if userId is provided
        if (userId) {
            this.settingsLoadPromise = this.aiSettingsManager.loadAISettings(userId);
        }
    }

    /**
     * Set the user ID and load AI settings
     * @param {string} userId - User ID to load settings for
     */
    async setUserId(userId) {
        this.userId = userId;
        if (userId) {
            this.settingsLoadPromise = this.aiSettingsManager.loadAISettings(userId);
            await this.settingsLoadPromise;
        }
    }

    /**
     * Ensure AI settings are loaded before making API calls
     * @returns {Promise<void>}
     */
    async ensureSettingsLoaded() {
        if (this.settingsLoadPromise) {
            await this.settingsLoadPromise;
            this.settingsLoadPromise = null; // Clear the promise after loading
        }
    }

    /**
     * Set the AI model to use (overrides settings)
     * @param {string} model - The model name to use
     */
    setModel(model) {
        if (model && typeof model === 'string') {
            // Create a temporary settings override
            const currentSettings = this.aiSettingsManager.getCurrentSettings();
            const overrideSettings = { ...currentSettings, model: model };
            this.aiSettingsManager.setSettings(overrideSettings);
            console.log(`AIQuestionAnswerer: Model overridden to: ${model}`);
        }
    }

    /**
     * Set user data from structured data and formatted text
     * @param {Object|string} userData - Structured user data or formatted text
     * @param {string} formattedText - Optional formatted text for AI prompts
     * @returns {Promise<Object>} - Success status
     */
    async setUserContext(userData, formattedText = null) {
        try {
            if (typeof userData === 'object' && userData !== null) {
                // We have structured data - use it for direct answers
                this.user_data = userData;
                this.formatted_text = formattedText || this.formatUserDataAsText();
                console.log('User context set with structured data');
            } else if (typeof userData === 'string') {
                // We only have formatted text - use it for both
                this.user_data = null;
                this.formatted_text = userData;
                console.log('User context set with formatted text only');
            } else {
                throw new Error('Invalid user data format');
            }
            
            console.log('User context set successfully');
            return { success: true };
        } catch (error) {
            console.error('Error in setUserContext:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Answer a question with or without options using AI
     * @param {string} question - The question to answer
     * @param {Array} options - Optional list of choices
     * @param {Function} shouldStop - Optional function to check if should stop
     * @returns {Promise<Object>} - Result object with status and answer
     */
    async answerQuestion(question, options = null, shouldStop = null) {
        try {
            // Ensure AI settings are loaded
            await this.ensureSettingsLoaded();
            
            console.log("Answering question:", question);
            console.log("Using AI model:", this.aiSettingsManager.getModel());
            console.log("Options:", options);
            
            // Check for direct matches first (personal info)
            const directAnswer = this.getDirectAnswer(question);
            if (directAnswer) {
                console.log("Found direct answer:", directAnswer);
                
                // If we have options, try to match the direct answer to one of them
                if (options && Array.isArray(options) && options.length > 0) {
                    const matchedOption = this.matchToOption(directAnswer, options);
                    console.log("Matched direct answer to option:", matchedOption);
                    return { success: true, answer: matchedOption };
                }
                
                return { success: true, answer: directAnswer };
            }
            
            // Check if we should stop before AI processing
            if (shouldStop) {
                let stopRequested = false;
                if (typeof shouldStop === 'function') {
                    stopRequested = await shouldStop();
                } else if (shouldStop && shouldStop.value !== undefined) {
                    stopRequested = shouldStop.value;
                } else {
                    stopRequested = !!shouldStop;
                }
                
                if (stopRequested) {
                    console.log("Stop requested before AI processing");
                    return { success: false, stopped: true };
                }
            }
            
            // Build enhanced prompt with user data
            const prompt = this.buildEnhancedPrompt(question, options);
            
            // Get AI response using AISettingsManager
            const response = await this.aiSettingsManager.callAIWithStop({
                prompt: prompt,
                stream: false
            }, shouldStop);
            
            // Check if the response indicates stopping
            if (response && response.stopped) {
                return { success: false, stopped: true };
            }
            
            let answer = response?.response?.trim() || "";
            
            // Post-process answer to enforce minimum 5 years for experience questions
            if (this.isYearsOfExperienceQuestion(question) && /^\d+$/.test(answer)) {
                const num = parseInt(answer);
                if (num < 5) {
                    answer = "5";
                    console.log(`Enforced minimum 5 years for experience question, was: ${num}`);
                }
            }
            
            // If we have options, ensure answer matches one of them
            if (options && Array.isArray(options) && options.length > 0) {
                answer = this.matchToOption(answer, options);
            }
            
            console.log("Final answer:", answer);
            return { 
                success: true, 
                answer: answer || "Information not available" 
            };
            
        } catch (error) {
            console.error('Error in answerQuestion:', error);
            
            // Smart fallback
            const fallbackAnswer = options && Array.isArray(options) && options.length > 0 
                ? (options.length > 1 ? options[1] : options[0])
                : "Information not available";
                
            return { success: true, answer: fallbackAnswer };
        }
    }

    /**
     * Check for direct answers from user data (email, phone, name, etc.)
     * @param {string} question - The question to check
     * @returns {string|null} - Direct answer if found, null otherwise
     */
    getDirectAnswer(question) {
        if (!this.user_data?.personal_information) {
            return null;
        }
        
        const info = this.user_data.personal_information;
        const q = question.toLowerCase();
        
        // Email
        if (q.includes("email") || q.includes("e-mail")) {
            return info.email || null;
        }
        
        // Phone
        if (q.includes("phone") || q.includes("mobile") || q.includes("telefon")) {
            const phone = info.phone_prefix ? `${info.phone_prefix}${info.phone}` : info.phone;
            return phone || null;
        }
        
        // First name
        if (q.includes("first name") || q.includes("vorname")) {
            return info.name || null;
        }
        
        // Last name  
        if (q.includes("last name") || q.includes("surname") || q.includes("nachname")) {
            return info.surname || null;
        }
        
        // Country
        if (q.includes("country") && !q.includes("code")) {
            return info.country || null;
        }
        
        // Notice period and starting date questions
        if (this.isNoticePeriodOrStartDateQuestion(question)) {
            if (q.includes("notice period") || q.includes("kündigungsfrist") || q.includes("kuendigungsfrist")) {
                // Return notice period in appropriate language
                if (q.includes("monate") || q.includes("deutsch")) {
                    return "2 Monate";
                } else {
                    return "2 months";
                }
            } else {
                // Return starting date
                return this.calculateDateTwoMonthsFromNow();
            }
        }
        
        return null;
    }
    
    /**
     * Build enhanced prompt with special handling for different question types
     * @param {string} question - The question
     * @param {Array} options - Available options (if any)
     * @returns {string} - Formatted prompt
     */
    buildEnhancedPrompt(question, options) {
        // Convert user data to text format
        const userData = this.formatUserDataAsText();
        
        let prompt = `You are a job applicant filling out a job application form. Answer questions based on your resume information in first person (as "I" not "he/she").

MY RESUME:
${userData}

QUESTION: ${question}

IMPORTANT GENERAL RULES:
- Answer as the job applicant (use "I", "my", "me" - NOT "he", "she", "Sami", or third person)
- Be concise and direct
- Only provide the specific information requested
- Do not mention your name unless explicitly asked`;

        // Special handling for decimal number questions
        if (this.isDecimalNumberQuestion(question)) {
            prompt += `

IMPORTANT RULES FOR DECIMAL NUMBERS:
- If asked for a decimal number, provide ONLY a decimal number (e.g., "3.5", "2.0", "1.2")
- Do NOT include explanations, descriptions, or additional text
- The number should be greater than 0.0 as requested
- Example: "3.0" not "3.0 years" or explanations`;
        }

        // Special handling for years of experience questions
        if (this.isYearsOfExperienceQuestion(question)) {
            prompt += `

IMPORTANT RULES FOR YEARS OF EXPERIENCE:
- If asked for years of experience, provide ONLY a number between 5-99
- MINIMUM is always 5 years - never return 0, 1, 2, 3, or 4
- Do NOT include words like "years", "Jahre", or descriptions
- For skill levels: Beginner=5, Intermediate=7, Advanced=10+ years
- Calculate based on work experience and skill level
- If no specific experience found, default to 5 years minimum
- If unclear or no data, always answer at least 5 years to maximize job prospects
- Example: "5" not "5 years" or "5 Jahre"
- Better to overestimate than underestimate for better interview chances`;
        }

        // Special handling for degree questions
        if (this.isDegreeQuestion(question)) {
            prompt += `

IMPORTANT RULES FOR DEGREE QUESTIONS:
- Check education section carefully for exact degree matches
- "Bachelor" = "Bachelor of Engineering" or "Bachelor of Science"
- "Master" = "Master of Engineering" or "Master of Science"
- Answer "Ja" for German forms, "Yes" for English forms
- If degree is found, answer positively
- Look for exact degree names in education section`;
        }

        // Special handling for skill level questions
        if (this.isSkillLevelQuestion(question)) {
            prompt += `

IMPORTANT RULES FOR SKILL LEVEL QUESTIONS:
- Check the skills section for exact skill matches
- Look for the skill name and its level (Beginner/Intermediate/Advanced)
- Be precise about the level mentioned in the resume
- Do not guess or estimate levels`;
        }

        // Special handling for notice period and starting date questions
        if (this.isNoticePeriodOrStartDateQuestion(question)) {
            const twoMonthsFromNow = this.calculateDateTwoMonthsFromNow();
            prompt += `

IMPORTANT RULES FOR NOTICE PERIOD AND START DATE:
- For notice period questions, answer "2 months" or "2 Monate"
- For starting date questions, provide the exact date: ${twoMonthsFromNow}
- Use the format DD.MM.YYYY for German forms (e.g., "15.03.2024")
- Use the format MM/DD/YYYY for English forms (e.g., "03/15/2024")
- Current calculated start date (2 months from today): ${twoMonthsFromNow}
- Be consistent with the date format expected by the form`;
        }

        if (options && Array.isArray(options) && options.length > 0) {
            const optionsStr = options.map(opt => `"${opt}"`).join(", ");
            prompt += `

Available Options: [${optionsStr}]

IMPORTANT: You MUST choose EXACTLY ONE option from the list above. Your answer should match one of the options EXACTLY as written.`;
        }

        prompt += `

ANSWER:`;

        return prompt;
    }

    /**
     * Check if question is asking for a decimal number
     * @param {string} question - The question text
     * @returns {boolean} - True if asking for decimal number
     */
    isDecimalNumberQuestion(question) {
        const lowerQ = question.toLowerCase();
        return lowerQ.includes('decimal') || 
               lowerQ.includes('dezimal') || 
               lowerQ.includes('größer als 0.0') ||
               lowerQ.includes('greater than 0.0') ||
               lowerQ.includes('decimal zahl') ||
               lowerQ.includes('decimal number');
    }

    /**
     * Check if question is asking for years of experience
     * @param {string} question - The question text
     * @returns {boolean} - True if asking for years
     */
    isYearsOfExperienceQuestion(question) {
        const lowerQ = question.toLowerCase();
        return lowerQ.includes('jahre') || 
               lowerQ.includes('years') || 
               lowerQ.includes('experience') || 
               lowerQ.includes('erfahrung') ||
               lowerQ.includes('how many') ||
               lowerQ.includes('wie viele');
    }

    /**
     * Check if question is asking about degrees/education
     * @param {string} question - The question text
     * @returns {boolean} - True if asking about degrees
     */
    isDegreeQuestion(question) {
        const lowerQ = question.toLowerCase();
        return lowerQ.includes('bachelor') || 
               lowerQ.includes('master') || 
               lowerQ.includes('degree') || 
               lowerQ.includes('abschluss') ||
               lowerQ.includes('bildung') ||
               lowerQ.includes('education');
    }

    /**
     * Check if question is asking about skill levels
     * @param {string} question - The question text
     * @returns {boolean} - True if asking about skill levels
     */
    isSkillLevelQuestion(question) {
        const lowerQ = question.toLowerCase();
        return lowerQ.includes('level') || 
               lowerQ.includes('niveau') || 
               lowerQ.includes('skill') || 
               lowerQ.includes('fähigkeit') ||
               lowerQ.includes('experience with') ||
               lowerQ.includes('erfahrung mit');
    }

    /**
     * Check if question is asking for notice period or starting date
     * @param {string} question - The question text
     * @returns {boolean} - True if asking for notice period or starting date
     */
    isNoticePeriodOrStartDateQuestion(question) {
        const lowerQ = question.toLowerCase();
        return lowerQ.includes('notice period') || 
               lowerQ.includes('starting date') || 
               lowerQ.includes('start date') ||
               lowerQ.includes('startdatum') ||
               lowerQ.includes('beginn') || 
               lowerQ.includes('beginnen') ||
               lowerQ.includes('kündigungsfrist') ||
               lowerQ.includes('kuendigungsfrist') ||
               lowerQ.includes('verfügbar') ||
               lowerQ.includes('verfuegbar') ||
               lowerQ.includes('available') ||
               lowerQ.includes('wann können sie') ||
               lowerQ.includes('when can you') ||
               lowerQ.includes('earliest start') ||
               lowerQ.includes('frühester beginn') ||
               lowerQ.includes('fruehester beginn');
    }

    /**
     * Calculate the date two months from now
     * @returns {string} - Date in DD.MM.YYYY format
     */
    calculateDateTwoMonthsFromNow() {
        const now = new Date();
        now.setMonth(now.getMonth() + 2); // Add 2 months
        const day = String(now.getDate()).padStart(2, '0');
        const month = String(now.getMonth() + 1).padStart(2, '0'); // Month is 0-indexed
        const year = now.getFullYear();
        return `${day}.${month}.${year}`;
    }
    
    /**
     * Format user data as readable text (like YAML formatting in Python)
     * @returns {string} - Formatted user data
     */
    formatUserDataAsText() {
        // Use pre-formatted text if available
        if (this.formatted_text) {
            return this.formatted_text;
        }
        
        if (!this.user_data) {
            return "No user data available.";
        }
        
        // If it's already a string, return it
        if (typeof this.user_data === 'string') {
            return this.user_data;
        }
        
        // Format object as readable text
        return this.formatObject(this.user_data, 0);
    }
    
    /**
     * Recursively format object as indented text
     * @param {*} obj - Object to format
     * @param {number} indent - Indentation level
     * @returns {string} - Formatted text
     */
    formatObject(obj, indent = 0) {
        const indentStr = "  ".repeat(indent);
        let result = "";
        
        if (typeof obj === 'object' && obj !== null) {
            if (Array.isArray(obj)) {
                for (const item of obj) {
                    if (typeof item === 'object' && item !== null) {
                        result += `${indentStr}- ${this.formatObject(item, indent + 1)}`;
                    } else {
                        result += `${indentStr}- ${item}\n`;
                    }
                }
            } else {
                for (const [key, value] of Object.entries(obj)) {
                    const formattedKey = key.toUpperCase().replace(/_/g, ' ');
                    result += `${indentStr}${formattedKey}:\n`;
                    if (typeof value === 'object' && value !== null) {
                        result += this.formatObject(value, indent + 1);
                    } else {
                        result += `${indentStr}  ${value}\n`;
                    }
                }
            }
        } else {
            result += `${indentStr}${obj}\n`;
        }
        
        return result;
    }
     
    /**
     * Match AI answer to one of the available options
     * @param {string} answer - AI generated answer
     * @param {Array} options - Available options
     * @returns {string} - Matched option
     */
    matchToOption(answer, options) {
        if (!answer || !options || options.length === 0) {
            return options?.length > 0 ? options[0] : "Not available";
        }
        
        // Extract decimal numbers from answer for decimal questions
        if (this.isDecimalNumberQuestion(answer) || /^\d+\.\d+$/.test(answer.trim())) {
            const decimalMatch = answer.match(/\d+\.\d+/);
            if (decimalMatch) {
                const decimal = decimalMatch[0];
                // Find matching option with the same decimal
                for (const option of options) {
                    if (option.includes(decimal)) {
                        return option;
                    }
                }
                // If no exact match, return the decimal itself
                return decimal;
            }
        }
        
        // Extract whole numbers from answer for years of experience
        if (this.isYearsOfExperienceQuestion(answer) || /^\d+$/.test(answer.trim())) {
            const numberMatch = answer.match(/\d+/);
            if (numberMatch) {
                let number = parseInt(numberMatch[0]);
                
                // Enforce minimum 5 years for experience questions
                if (this.isYearsOfExperienceQuestion(answer) && number < 5) {
                    number = 5;
                }
                
                const numberStr = number.toString();
                
                // Find matching option with the same number
                for (const option of options) {
                    if (option.includes(numberStr)) {
                        return option;
                    }
                }
                // If no exact match, return the number itself
                return numberStr;
            }
        }
        
        // Special handling for notice period and starting date questions
        if (this.isNoticePeriodOrStartDateQuestion(answer)) {
            // Check if answer contains "2 months" or "2 Monate"
            if (answer.toLowerCase().includes("2 months") || answer.toLowerCase().includes("2 monate")) {
                for (const option of options) {
                    if (option.toLowerCase().includes("2 months") || 
                        option.toLowerCase().includes("2 monate") ||
                        option.toLowerCase().includes("2 month")) {
                        return option;
                    }
                }
                return answer; // Return the answer as-is if no matching option
            }
            
            // Check if answer contains a date (DD.MM.YYYY or MM/DD/YYYY format)
            const dateMatch = answer.match(/\d{1,2}[.\/-]\d{1,2}[.\/-]\d{4}/);
            if (dateMatch) {
                const dateStr = dateMatch[0];
                for (const option of options) {
                    if (option.includes(dateStr)) {
                        return option;
                    }
                }
                return dateStr; // Return the date as-is if no matching option
            }
        }
        
        // Exact match (case insensitive)
        for (const option of options) {
            if (option.toLowerCase() === answer.toLowerCase()) {
                return option;
            }
        }
        
        // Partial match
        for (const option of options) {
            if (option.toLowerCase().includes(answer.toLowerCase()) || 
                answer.toLowerCase().includes(option.toLowerCase())) {
                return option;
            }
        }
        
        // Country code special handling
        if (answer.toLowerCase().includes("germany") || answer.toLowerCase().includes("deutsch")) {
            for (const option of options) {
                if (option.toLowerCase().includes("deutsch") || 
                    option.toLowerCase().includes("germany") ||
                    option.includes("+49")) {
                    return option;
                }
            }
        }
        
        // Fallback
        return options.length > 1 ? options[1] : options[0];
    }

    /**
     * Test AI connection using AISettingsManager
     * @returns {Promise<boolean>} - Whether connection was successful
     */
    async testConnection() {
        try {
            await this.ensureSettingsLoaded();
            const result = await this.aiSettingsManager.testConnection();
            return result.success;
        } catch (error) {
            console.error('Error testing AI connection:', error);
            return false;
        }
    }

    /**
     * Get current AI settings
     * @returns {Object} - Current AI settings
     */
    getAISettings() {
        return this.aiSettingsManager.getCurrentSettings();
    }

    /**
     * Clear all data
     */
    clear() {
        this.user_data = null;
        this.formatted_text = null;
        this.aiSettingsManager.clear();
        this.settingsLoadPromise = null;
    }
}

export default AIQuestionAnswerer; 