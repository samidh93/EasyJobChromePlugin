import memoryStore from './MemoryStore.js';
import conversationHistory from './ConversationHistory.js';
import profileLoader from './profileLoader.js';

class AIQuestionAnswerer {
    constructor(apiEndpoint = null) {
        this.apiEndpoint = apiEndpoint || 'http://localhost:11434/api/generate';
        this.model = 'qwen2.5:3b';
        this.job = null;
        this.user_data = null;
        this.jobInfo = null;
        // Add batching properties
        this.pendingQuestions = [];
        this.batchTimeout = null;
        this.isProcessingBatch = false;
    }

    /**
     * Set the current job information
     * @param {Object} jobInfo - Job details
     */
    setJob(jobInfo) {
        this.job = jobInfo;
        console.log('Job information set:', jobInfo);
        
        const currentJob = jobInfo && jobInfo.currentJob ? jobInfo.currentJob : null;
        
        if (currentJob) {
            this.jobInfo = {
                company: currentJob.company || '',
                title: currentJob.title || '',
                location: currentJob.location || '',
                description: currentJob.description || ''
            };
            
            // Create a conversation context for this company
            console.log(`Creating conversation context for ${this.jobInfo.company}`);
        } else {
            console.log('No job information provided');
        }
    }

    /**
     * Process user data from YAML and store as embeddings
     * @param {string} yamlContent - YAML content to process
     * @param {function} progressCallback - Optional callback for progress updates
     * @returns {Promise<Object>} - Success status
     */
    async setUserContext(yamlContent, progressCallback = null) {
        try {
            // Use profileLoader to process the user context
            const result = await profileLoader.processUserContext(yamlContent, progressCallback);
            
            if (result.success) {
                // Store the user data for future use
                this.user_data = result.data;
            }
            
            return { 
                success: result.success,
                error: result.error || null
            };
        } catch (error) {
            console.error('Error in setUserContext:', error);
            if (progressCallback) {
                progressCallback({ progress: 0, message: `Error: ${error.message}` });
            }
            return { success: false, error: error.message };
        }
    }

    /**
     * Main method to answer a question with or without options
     * @param {string} question - The question to answer
     * @param {Array} options - Optional list of choices
     * @returns {Promise<string>} - The answer
     */
    async answerQuestion(question, options = null) {
        try {
            console.log("Answering question:", question);
            console.log("Options:", options);
            
            // Improve userData presence debug message to be clearer
            console.log(
                this.user_data ? 
                "In-memory user data cache: Available" : 
                "In-memory user data cache: Not available (will use embedding search from storage)"
            );
            
            if (options && Array.isArray(options) && options.length > 0) {
                return await this.answerWithOptions(question, options);
            } else {
                return await this.answerWithNoOptions(question);
            }
        } catch (error) {
            console.error('Error in answerQuestion:', error);
            return "Error processing question";
        }
    }

    /**
     * Answer a question with provided options
     * @param {string} question - The question to answer
     * @param {Array} options - Available options to choose from
     * @returns {Promise<string>} - The answer
     */
    async answerWithOptions(question, options) {
        try {
            console.log(`Getting an answer for "${question}" with options:`, options);
            
            if (!options || !Array.isArray(options) || options.length === 0) {
                console.warn("Options array is empty or invalid, falling back to answerWithNoOptions");
                return this.answerWithNoOptions(question);
            }
            
            // Special handling for common questions without using embeddings
            // Phone country code matching
            if (question.toLowerCase().includes("phone country") || 
                question.toLowerCase().includes("country code") ||
                question.toLowerCase().includes("landesvorwahl")) {
                
                console.log("Found direct match for contact query");
                
                const contactInfo = this.user_data?.personal_information || {};
                if (contactInfo.country) {
                    const countryName = contactInfo.country;
                    
                    // Try to find this country in the options
                    let matchedOption = null;
                    
                    // Check if any option contains the country name
                    for (const option of options) {
                        if (option.toLowerCase().includes(countryName.toLowerCase())) {
                            matchedOption = option;
                            break;
                        }
                    }
                    
                    if (matchedOption) {
                        console.log(`Found country match: ${matchedOption}`);
                        
                        // Add to batch instead of immediate storage
                        this.addToPendingBatch(question, matchedOption, options);
                        
                        return matchedOption;
                    } else {
                        // If we can't find the country directly, try Deutschland / Germany
                        if (countryName.toLowerCase().includes("german") || countryName.toLowerCase().includes("deutsch")) {
                            // Look for German options
                            for (const option of options) {
                                if (option.toLowerCase().includes("germany") || 
                                    option.toLowerCase().includes("deutsch") ||
                                    option.toLowerCase().includes("+49")) {
                                    
                                    console.log(`Found German option: ${option}`);
                                    
                                    // Add to batch instead of immediate storage
                                    this.addToPendingBatch(question, option, options);
                                    
                                    return option;
                                }
                            }
                        }
                    }
                }
            }
            
            // Get relevant context like in Python
            console.log("Starting semantic search for relevant information...");
            const relevantKeys = await memoryStore.search(question, 3);
            
            let relevantContext = "";
            
            if (relevantKeys.length > 0) {
                console.log(`Found ${relevantKeys.length} relevant keys:`, relevantKeys);
                relevantContext = relevantKeys.map(key => 
                    `${key}: ${memoryStore.data[key].text}`
                ).join(", ");
            } else {
                console.log("No relevant information found in profile data. Using generic context.");
                relevantContext = "The user has significant experience and qualifications suitable for this question.";
            }
            
            // Get user's phone and salary for specific prompts
            const personalInfo = this.user_data?.personal_information || {};
            const phone = personalInfo.phone || "";
            const desiredSalary = personalInfo.salary || "";
            
            try {
                // Build prompt using ConversationHistory
                const prompt = conversationHistory.buildOptionsPrompt(question, options, relevantContext);
                
                // Add to conversation history
                conversationHistory.addUserMessage(prompt);
                
                // Call Ollama API
                const response = await this.callOllamaAPI({
                    model: this.model,
                    messages: conversationHistory.getCurrentHistory(),
                    options: { temperature: 0.0 },
                    stream: false // Explicitly disable streaming
                });
                
                let rawAnswer = response?.message?.content?.trim() || "";
                
                // Remove thinking sections like in Python
                let answerCandidate = rawAnswer.replace(/<think>[\s\S]*?<\/think>/g, "").trim();
                
                // First check if the answer directly matches one of the options
                if (options.includes(answerCandidate)) {
                    // Direct match found, use it
                    console.log(`Found exact match in options: "${answerCandidate}"`);
                    conversationHistory.addAssistantResponse(answerCandidate);
                    
                    // Add to batch instead of immediate storage
                    this.addToPendingBatch(question, answerCandidate, options);
                    
                    return answerCandidate;
                }
                
                // If we're here, the answer wasn't an exact match - try to refine it
                console.log(`Answer "${answerCandidate}" not found in options, attempting to refine`);
                const refinedAnswer = await this.refineOptionSelection(answerCandidate, options);
                
                // Add to batch instead of immediate storage
                this.addToPendingBatch(question, refinedAnswer, options);
                
                return refinedAnswer;
                
            } catch (ollamaError) {
                console.error("Ollama API error in answerWithOptions:", ollamaError);
                
                // Smart fallback based on context when Ollama fails
                console.log("[Function] Falling back to direct context match due to API error");
                
                // Log what we found
                console.log("[Function] AI Answer:", memoryStore.data[relevantKeys[0]]?.text);
                
                // Simple fallback - if we found a relevant key, use its value
                if (relevantKeys.length > 0) {
                    const contextValue = memoryStore.data[relevantKeys[0]]?.text || "";
                    
                    // Try to find the best matching option based on the context
                    const bestMatch = await this.refineOptionSelection(contextValue, options);
                    
                    // Add to batch instead of immediate storage
                    this.addToPendingBatch(question, bestMatch, options);
                    
                    return bestMatch;
                }
                
                // Still fallback to options[1] or options[0] as last resort
                const fallbackOption = options.length > 1 ? options[1] : options[0];
                console.log("[Function] Selected fallback option:", fallbackOption);
                conversationHistory.addAssistantResponse(fallbackOption);
                
                // Add to batch instead of immediate storage
                this.addToPendingBatch(question, fallbackOption, options);
                
                return fallbackOption;
            }
        } catch (error) {
            console.error('Error in answerWithOptions:', error);
            // Fallback to second option like Python
            const fallbackOption = options.length > 1 ? options[1] : options[0];
            conversationHistory.addAssistantResponse(fallbackOption);
            
            // Add to batch instead of immediate storage
            this.addToPendingBatch(question, fallbackOption, options);
            
            return fallbackOption;
        }
    }

    /**
     * Refine an initial answer to match one of the available options
     * @param {string} initialAnswer - The initial answer that doesn't match any option
     * @param {Array} options - Available options to choose from
     * @returns {Promise<string>} - The refined answer
     */
    async refineOptionSelection(initialAnswer, options) {
        try {
            console.log(`Refining answer: "${initialAnswer}" to match available options`);
            
            // Check if this is a German/country question for special handling
            const isGermanQuestion = initialAnswer.toLowerCase().includes("germany") || 
                                   initialAnswer.toLowerCase().includes("deutsch");
            
            // First, try exact matching (case insensitive)
            for (const option of options) {
                if (option.toLowerCase() === initialAnswer.toLowerCase()) {
                    console.log(`Successfully refined to "${option}"`);
                    conversationHistory.addAssistantResponse(option);
                    return option;
                }
            }
            
            // Special handling for German/country questions
            if (isGermanQuestion || options.some(opt => opt.includes("(+") && opt.includes(")"))) {
                for (const option of options) {
                    if (option.toLowerCase().includes("deutsch")) {
                        console.log(`Found German option: "${option}"`);
                        conversationHistory.addAssistantResponse(option);
                        return option;
                    }
                }
            }
            
            // If exact match fails, try partial matching
            console.log(`Refined answer "${initialAnswer}" still not in options, using basic matching`);
            
            let bestMatch = null;
            let bestScore = -1;
            
            for (const option of options) {
                const optionLower = option.toLowerCase();
                const answerLower = initialAnswer.toLowerCase();
                
                if (optionLower.includes(answerLower) || answerLower.includes(optionLower)) {
                    const score = Math.max(optionLower.length, answerLower.length) - 
                                Math.abs(optionLower.length - answerLower.length);
                    if (score > bestScore) {
                        bestScore = score;
                        bestMatch = option;
                    }
                }
            }
            
            if (bestMatch) {
                console.log(`Found best match: "${bestMatch}" with score ${bestScore}`);
                conversationHistory.addAssistantResponse(bestMatch);
                return bestMatch;
            }
            
            // Final fallback - use second option if available, otherwise first
            const fallbackOption = options.length > 1 ? options[1] : options[0];
            console.log(`No match found, using fallback: "${fallbackOption}"`);
            conversationHistory.addAssistantResponse(fallbackOption);
            return fallbackOption;
            
        } catch (error) {
            console.error("Error in refineOptionSelection:", error);
            const fallbackOption = options.length > 1 ? options[1] : options[0];
            conversationHistory.addAssistantResponse(fallbackOption);
            return fallbackOption;
        }
    }

    /**
     * Answer a question without options using relevant context from user data
     * @param {string} question - The question to answer
     * @returns {Promise<string>} - The answer
     */
    async answerWithNoOptions(question) {
        try {
            console.log(`Answering question without options: "${question}"`);
            
            // Check if we have user data for direct answers
            if (this.user_data?.personal_information) {
                const contactInfo = this.user_data.personal_information;
                
                // Direct email matching
                if (question.toLowerCase().includes("email") || question.toLowerCase().includes("e-mail")) {
                    console.log("Found direct match for email query");
                    const email = contactInfo.email || "";
                    if (email) {
                        this.addToPendingBatch(question, email);
                        return email;
                    }
                }
                
                // Direct phone matching
                if (question.toLowerCase().includes("phone") || 
                    question.toLowerCase().includes("mobile") || 
                    question.toLowerCase().includes("telephone") ||
                    question.toLowerCase().includes("telefon")) {
                    console.log("Found direct match for phone query");
                    const phone = contactInfo.country_code ? 
                        contactInfo.country_code + contactInfo.phone : 
                        contactInfo.phone || "";
                    if (phone) {
                        this.addToPendingBatch(question, phone);
                        return phone;
                    }
                }
                
                // Direct first name matching
                if (question.toLowerCase().includes("name") && question.toLowerCase().includes("first")) {
                    console.log("Found direct match for first name query");
                    const firstName = contactInfo.name || "";
                    if (firstName) {
                        this.addToPendingBatch(question, firstName);
                        return firstName;
                    }
                }
                
                // Direct last name matching
                if (question.toLowerCase().includes("name") && question.toLowerCase().includes("last")) {
                    console.log("Found direct match for last name query");
                    const lastName = contactInfo.surname || "";
                    if (lastName) {
                        this.addToPendingBatch(question, lastName);
                        return lastName;
                    }
                }
            }
            
            // Get relevant context like in Python
            console.log("Starting semantic search for relevant information...");
            const relevantKeys = await memoryStore.search(question, 3);
            
            let relevantContext = "";
            
            if (relevantKeys.length > 0) {
                console.log(`Found ${relevantKeys.length} relevant keys:`, relevantKeys);
                relevantContext = relevantKeys.map(key => 
                    `${key}: ${memoryStore.data[key].text}`
                ).join(", ");
            } else {
                console.log("No relevant information found in profile data. Using generic context.");
                relevantContext = "The user has significant experience and qualifications suitable for this question.";
            }
            
            // Get user's phone and salary for specific prompts
            const personalInfo = this.user_data?.personal_information || {};
            const phone = personalInfo.phone || "";
            const desiredSalary = personalInfo.salary || "";
            
            try {
                // Build prompt using ConversationHistory
                const prompt = conversationHistory.buildNoOptionsPrompt(question, relevantContext, phone, desiredSalary, this.user_data);
                
                // Add to conversation history
                conversationHistory.addUserMessage(prompt);
                
                // Call Ollama API
                const response = await this.callOllamaAPI({
                    model: this.model,
                    messages: conversationHistory.getCurrentHistory(),
                    options: { temperature: 0.0 },
                    stream: false
                });
                
                let rawAnswer = response?.message?.content?.trim() || "";
                
                // Remove thinking sections
                let answerCandidate = rawAnswer.replace(/<think>[\s\S]*?<\/think>/g, "").trim();
                
                if (answerCandidate && answerCandidate !== "Information not available") {
                    console.log(`AI generated answer: "${answerCandidate}"`);
                    conversationHistory.addAssistantResponse(answerCandidate);
                    
                    this.addToPendingBatch(question, answerCandidate);
                    
                    return answerCandidate;
                }
                
                // Fallback response
                const fallbackResponse = "Information not available";
                this.addToPendingBatch(question, fallbackResponse);
                
                return fallbackResponse;
                
            } catch (ollamaError) {
                console.error("Ollama API error in answerWithNoOptions:", ollamaError);
                
                // Smart fallback based on context when Ollama fails
                console.log("[Function] Falling back to direct context match due to API error");
                
                // Simple fallback - if we found a relevant key, use its value
                if (relevantKeys.length > 0) {
                    const directValue = memoryStore.data[relevantKeys[0]]?.text || "";
                    
                    // Extract numbers if the question seems to ask for a number
                    const numberMatch = directValue.match(/\d+/);
                    if (numberMatch && (question.toLowerCase().includes("year") || 
                                     question.toLowerCase().includes("experience") ||
                                     question.toLowerCase().includes("salary"))) {
                        console.log("[Function] Extracted number:", numberMatch[0]);
                        this.addToPendingBatch(question, numberMatch[0]);
                        return numberMatch[0];
                    }
                    
                    if (directValue && directValue.trim()) {
                        this.addToPendingBatch(question, directValue);
                        return directValue;
                    }
                }
                
                // Specific fallbacks for common question types
                if (["phone", "telefon", "salary", "gehalt", "compensation", "vergütung"].some(keyword => 
                    question.toLowerCase().includes(keyword))) {
                    
                    if (question.toLowerCase().includes("phone") || question.toLowerCase().includes("telefon")) {
                        const fallback = phone || "Not provided";
                        this.addToPendingBatch(question, fallback);
                        return fallback;
                    }
                    
                    if (question.toLowerCase().includes("salary") || 
                        question.toLowerCase().includes("gehalt") || 
                        question.toLowerCase().includes("compensation") ||
                        question.toLowerCase().includes("vergütung")) {
                        const fallback = desiredSalary || "Negotiable";
                        this.addToPendingBatch(question, fallback);
                        return fallback;
                    }
                }
                
                const fallbackResponse = "Information not available";
                this.addToPendingBatch(question, fallbackResponse);
                
                return fallbackResponse;
            }
        } catch (error) {
            console.error('Error in answerWithNoOptions:', error);
            const fallbackResponse = "Error generating response";
            this.addToPendingBatch(question, fallbackResponse);
            
            return fallbackResponse;
        }
    }

    /**
     * Call the Ollama API through the background script
     * @param {Object} requestBody - Request body
     * @returns {Promise<Object>} - API response
     */
    async callOllamaAPI(requestBody) {
        try {
            // Remove connection check for better performance
            // Directly call the API without checking connection first
            
            // Call via background script to avoid CORS issues
            return new Promise((resolve, reject) => {
                chrome.runtime.sendMessage(
                    {
                        action: 'callOllama',
                        endpoint: 'chat',
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
     * Optional method to check connection to Ollama
     * This method is no longer called automatically before API calls.
     * You can call it manually when needed to verify Ollama is running.
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

    /**
     * Send conversation update to the popup for display
     */
    sendConversationUpdate() {
        if (!this.jobInfo) {
            console.log("No job info available, skipping conversation update");
            return;
        }
        
        try {
            // Get current conversation
            const conversation = conversationHistory.getCurrentHistory();
            if (!conversation || conversation.length < 2) {
                console.log("No meaningful conversation to send");
                return;
            }
            
            // Find the latest question for identification
            const latestUserMsg = conversation.find(msg => msg.role === 'user');
            if (!latestUserMsg) {
                console.log("No user message found in conversation");
                return;
            }
            
            // Extract the question part for a more reliable identifier
            const questionMatch = latestUserMsg.content.match(/Form Question:\s*([^?]+)\s*\?/);
            const questionId = questionMatch ? questionMatch[1].trim() : latestUserMsg.content.substring(0, 30);
            
            console.log(`Sending conversation update to background for question: "${questionId}"`);
            
            // Send the current conversation to be stored immediately
            chrome.runtime.sendMessage({
                action: 'CONVERSATION_UPDATED',
                data: {
                    company: this.jobInfo.company,
                    title: this.jobInfo.title,
                    conversation: conversation,
                    timestamp: Date.now(),
                    questionId: questionId
                }
            });
        } catch (error) {
            console.error("Error sending conversation update:", error);
        }
    }
    
    /**
     * Finalize the current conversation
     * This should be called when moving to a new form or page
     * Note: Since we're now storing each question immediately, 
     * this method is retained for compatibility but doesn't need to do anything
     */
    finalizeConversation() {
        console.log("finalizeConversation called but not needed - conversations are stored immediately");
    }

    /**
     * Add a question-answer pair to the pending batch
     * @param {string} question - The question text
     * @param {string} answer - The answer text
     * @param {Array} options - Available options (if any)
     */
    addToPendingBatch(question, answer, options = []) {
        const questionData = {
            question: question,
            answer: answer,
            options: options,
            timestamp: Date.now(),
            questionId: this.extractQuestionId(question)
        };
        
        this.pendingQuestions.push(questionData);
        console.log(`Added question to batch: "${questionData.questionId}" (Total pending: ${this.pendingQuestions.length})`);
        
        // Schedule batch processing with debouncing
        this.scheduleBatchStorage();
    }
    
    /**
     * Extract a clean question ID from the question text
     * @param {string} question - The question text
     * @returns {string} - Clean question identifier
     */
    extractQuestionId(question) {
        // Remove common prefixes and clean up
        let cleanQuestion = question
            .replace(/^(Form Question:|Question:)\s*/i, '')
            .replace(/\s*\?\s*$/, '')
            .trim();
            
        // Take first 50 characters for ID
        return cleanQuestion.substring(0, 50);
    }
    
    /**
     * Schedule batch storage with debouncing to avoid multiple rapid calls
     */
    scheduleBatchStorage() {
        // Clear existing timeout
        if (this.batchTimeout) {
            clearTimeout(this.batchTimeout);
        }
        
        // Schedule new batch processing after 2 seconds of inactivity
        this.batchTimeout = setTimeout(() => {
            this.processPendingBatch();
        }, 2000);
    }
    
    /**
     * Process and store all pending questions as individual conversations
     */
    async processPendingBatch() {
        if (this.isProcessingBatch || this.pendingQuestions.length === 0) {
            return;
        }
        
        if (!this.jobInfo) {
            console.log("No job info available, clearing pending questions");
            this.pendingQuestions = [];
            return;
        }
        
        this.isProcessingBatch = true;
        console.log(`Processing batch of ${this.pendingQuestions.length} questions for ${this.jobInfo.title}`);
        
        try {
            // Process each question as a separate conversation
            for (const questionData of this.pendingQuestions) {
                await this.storeIndividualConversation(questionData);
                // Small delay between storage operations
                await new Promise(resolve => setTimeout(resolve, 100));
            }
            
            console.log(`Successfully stored ${this.pendingQuestions.length} conversations`);
            
            // Clear the batch
            this.pendingQuestions = [];
            
        } catch (error) {
            console.error("Error processing question batch:", error);
        } finally {
            this.isProcessingBatch = false;
        }
    }
    
    /**
     * Store an individual question-answer pair as a complete conversation
     * @param {Object} questionData - Question data object
     */
    async storeIndividualConversation(questionData) {
        try {
            // Create a complete conversation for this question
            const conversation = [
                {
                    role: "system",
                    content: "You are a helpful assistant that answers job application questions accurately and professionally."
                },
                {
                    role: "user", 
                    content: this.buildUserMessage(questionData.question, questionData.options)
                },
                {
                    role: "assistant",
                    content: questionData.answer
                }
            ];
            
            // Send to background for storage
            return new Promise((resolve) => {
                chrome.runtime.sendMessage({
                    action: 'CONVERSATION_UPDATED',
                    data: {
                        company: this.jobInfo.company,
                        title: this.jobInfo.title,
                        conversation: conversation,
                        timestamp: questionData.timestamp,
                        questionId: questionData.questionId
                    }
                }, (response) => {
                    console.log(`Stored conversation for: "${questionData.questionId}"`);
                    resolve(response);
                });
            });
            
        } catch (error) {
            console.error(`Error storing conversation for "${questionData.questionId}":`, error);
        }
    }
    
    /**
     * Build a properly formatted user message
     * @param {string} question - The question text
     * @param {Array} options - Available options
     * @returns {string} - Formatted user message
     */
    buildUserMessage(question, options = []) {
        let message = `Form Question: ${question}?`;
        
        if (options && options.length > 0) {
            const optionsStr = options.map(opt => `"${opt}"`).join(", ");
            message += `\nAvailable Options: [${optionsStr}]`;
        }
        
        return message;
    }
    
    /**
     * Force immediate processing of pending batch
     * Call this when moving to next page or finishing form
     */
    async flushPendingQuestions() {
        if (this.batchTimeout) {
            clearTimeout(this.batchTimeout);
            this.batchTimeout = null;
        }
        
        if (this.pendingQuestions.length > 0) {
            console.log("Flushing pending questions before page change");
            await this.processPendingBatch();
        }
    }
}

export default AIQuestionAnswerer; 