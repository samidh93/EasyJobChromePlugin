// No imports needed - we'll work directly with user data

class AIQuestionAnswerer {
    constructor() {
        this.model = 'qwen2.5:3b';
        this.user_data = null;
    }

    /**
     * Set user data directly from parsed YAML/JSON
     * @param {string} yamlContent - YAML content to process
     * @returns {Promise<Object>} - Success status
     */
    async setUserContext(yamlContent) {
        try {
            // Parse YAML content directly (assuming it's already parsed or we have a parser)
            if (typeof yamlContent === 'string') {
                // If it's a string, we'd need to parse it
                console.log('User context set as string - should be parsed object');
                this.user_data = yamlContent;
            } else {
                // It's already a parsed object
                this.user_data = yamlContent;
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
     * @returns {Promise<string>} - The answer
     */
    async answerQuestion(question, options = null) {
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
                    return matchedOption;
                }
                
                return directAnswer;
            }
            
            // Build simple prompt with user data (like in Python test)
            const prompt = this.buildSimplePrompt(question, options);
            
            // Get AI response
            const response = await this.callOllamaAPI({
                model: this.model,
                prompt: prompt,
                stream: false
            });
            
            let answer = response?.response?.trim() || "";
            
            // If we have options, ensure answer matches one of them
            if (options && Array.isArray(options) && options.length > 0) {
                answer = this.matchToOption(answer, options);
            }
            
            console.log("Final answer:", answer);
            return answer || "Information not available";
            
        } catch (error) {
            console.error('Error in answerQuestion:', error);
            
            // Smart fallback
            if (options && Array.isArray(options) && options.length > 0) {
                return options.length > 1 ? options[1] : options[0];
            }
            return "Information not available";
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
     * Build simple prompt with user data (like Python test)
     * @param {string} question - The question
     * @param {Array} options - Available options (if any)
     * @returns {string} - Formatted prompt
     */
    buildSimplePrompt(question, options) {
        // Convert user data to text format (like in Python test)
        const userData = this.formatUserDataAsText();
        
        let prompt = `Based on the following resume information, please answer the question accurately and concisely:

RESUME:
${userData}

QUESTION: ${question}`;

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
     * Format user data as readable text (like YAML formatting in Python)
     * @returns {string} - Formatted user data
     */
    formatUserDataAsText() {
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