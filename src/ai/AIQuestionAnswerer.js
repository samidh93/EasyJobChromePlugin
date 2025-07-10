// No imports needed - we'll work directly with user data

class AIQuestionAnswerer {
    constructor() {
        this.model = 'qwen2.5:3b';
        this.user_data = null;
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
            console.log("Answering question:", question);
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
            
            // Get AI response with timeout and stop checking
            const response = await this.callOllamaAPIWithStop({
                model: this.model,
                prompt: prompt,
                stream: false
            }, shouldStop);
            
            // Check if the response indicates stopping
            if (response && response.stopped) {
                return { success: false, stopped: true };
            }
            
            let answer = response?.response?.trim() || "";
            
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
        
        let prompt = `Based on the following resume information, please answer the question accurately and concisely:

RESUME:
${userData}

QUESTION: ${question}`;

        // Special handling for years of experience questions
        if (this.isYearsOfExperienceQuestion(question)) {
            prompt += `

IMPORTANT RULES FOR YEARS OF EXPERIENCE:
- If asked for years of experience, provide ONLY a number between 0-99
- Do NOT include words like "years", "Jahre", or descriptions
- For skill levels: Beginner=1, Intermediate=3, Advanced=5+ years
- Calculate based on work experience and skill level
- If no specific experience found, estimate based on skill level
- Example: "3" not "3 years" or "3 Jahre"`;
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
        
        // Extract numbers from answer for years of experience
        if (this.isYearsOfExperienceQuestion(answer) || /^\d+$/.test(answer.trim())) {
            const numberMatch = answer.match(/\d+/);
            if (numberMatch) {
                const number = numberMatch[0];
                // Find matching option with the same number
                for (const option of options) {
                    if (option.includes(number)) {
                        return option;
                    }
                }
                // If no exact match, return the number itself
                return number;
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
     * Call the Ollama API through the background script
     * @param {Object} requestBody - Request body  
     * @returns {Promise<Object>} - API response
     */
    async callOllamaAPI(requestBody) {
        try {
            // Call via background script to avoid CORS issues (using generate endpoint like Python test)
            return new Promise((resolve, reject) => {
                chrome.runtime.sendMessage(
                    {
                        action: 'callOllama',
                        endpoint: 'generate',
                        data: requestBody
                    },
                    response => {
                        if (chrome.runtime.lastError) {
                            reject(new Error(chrome.runtime.lastError.message));
                        } else if (response.success === false) {
                            reject(new Error(response.error || 'Unknown error from Ollama API'));
                        } else {
                            resolve(response.data);
                        }
                    }
                );
            });
        } catch (error) {
            console.error('Error calling Ollama API:', error);
            throw error;
        }
    }

    /**
     * Call the Ollama API with stop checking during the request
     * @param {Object} requestBody - Request body
     * @param {Function} shouldStop - Function to check if should stop
     * @returns {Promise<Object>} - API response or stop status
     */
    async callOllamaAPIWithStop(requestBody, shouldStop = null) {
        try {
            // Call via background script to avoid CORS issues
            return new Promise((resolve, reject) => {
                // Set up periodic stop checking during the API call
                let stopCheckInterval = null;
                
                if (shouldStop) {
                    stopCheckInterval = setInterval(async () => {
                        try {
                            let stopRequested = false;
                            if (typeof shouldStop === 'function') {
                                stopRequested = await shouldStop();
                            } else if (shouldStop && shouldStop.value !== undefined) {
                                stopRequested = shouldStop.value;
                            } else {
                                stopRequested = !!shouldStop;
                            }
                            
                            if (stopRequested) {
                                console.log("Stop requested during AI API call");
                                if (stopCheckInterval) {
                                    clearInterval(stopCheckInterval);
                                }
                                resolve({ stopped: true });
                            }
                        } catch (error) {
                            console.error('Error in stop check:', error);
                        }
                    }, 500); // Check every 500ms
                }
                
                chrome.runtime.sendMessage(
                    {
                        action: 'callOllama',
                        endpoint: 'generate',
                        data: requestBody
                    },
                    response => {
                        // Clear the stop check interval
                        if (stopCheckInterval) {
                            clearInterval(stopCheckInterval);
                        }
                        
                        if (chrome.runtime.lastError) {
                            reject(new Error(chrome.runtime.lastError.message));
                        } else if (response.success === false) {
                            reject(new Error(response.error || 'Unknown error from Ollama API'));
                        } else {
                            resolve(response.data);
                        }
                    }
                );
            });
        } catch (error) {
            console.error('Error calling Ollama API:', error);
            throw error;
        }
    }

    /**
     * Check connection to Ollama (optional)
     * @returns {Promise<boolean>} - Whether connection was successful
     */
    async checkOllamaConnection() {
        try {
            return new Promise((resolve, reject) => {
                chrome.runtime.sendMessage(
                    { action: 'testOllama' },
                    response => {
                        if (chrome.runtime.lastError) {
                            reject(new Error(chrome.runtime.lastError.message));
                        } else if (response && response.success) {
                            resolve(true);
                        } else {
                            reject(new Error(response?.error || 'Failed to connect to Ollama'));
                        }
                    }
                );
            });
        } catch (error) {
            console.error('Error checking Ollama connection:', error);
            throw error;
        }
    }
}

export default AIQuestionAnswerer; 