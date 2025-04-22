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
                        
                        // Record this answer in the conversation history
                        conversationHistory.addAssistantResponse(matchedOption);
                        
                        // Send the conversation update to the popup
                        this.sendConversationUpdate();
                        
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
                                    
                                    // Record this answer in the conversation history
                                    conversationHistory.addAssistantResponse(option);
                                    
                                    // Send the conversation update to the popup
                                    this.sendConversationUpdate();
                                    
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
                    
                    // Send the conversation update to the popup
                    this.sendConversationUpdate();
                    
                    return answerCandidate;
                }
                
                // If we're here, the answer wasn't an exact match - try to refine it
                console.log(`Answer "${answerCandidate}" not found in options, attempting to refine`);
                const refinedAnswer = await this.refineOptionSelection(answerCandidate, options);
                
                // Send the conversation update to the popup after refinement
                this.sendConversationUpdate();
                
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
                    
                    // Send the conversation update to the popup
                    this.sendConversationUpdate();
                    
                    return bestMatch;
                }
                
                // Still fallback to options[1] or options[0] as last resort
                const fallbackOption = options.length > 1 ? options[1] : options[0];
                console.log("[Function] Selected fallback option:", fallbackOption);
                conversationHistory.addAssistantResponse(fallbackOption);
                
                // Send the conversation update to the popup
                this.sendConversationUpdate();
                
                return fallbackOption;
            }
        } catch (error) {
            console.error('Error in answerWithOptions:', error);
            // Fallback to second option like Python
            const fallbackOption = options.length > 1 ? options[1] : options[0];
            conversationHistory.addAssistantResponse(fallbackOption);
            
            // Send the conversation update to the popup even when there's an error
            this.sendConversationUpdate();
            
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
            
            // Check if this is a country code question (Landesvorwahl)
            const isCountryCodeQuestion = 
                initialAnswer.toLowerCase().includes("germany") || 
                initialAnswer.toLowerCase().includes("deutschland") ||
                initialAnswer.includes("+49");
            
            let refinementPrompt = `
Original answer: ${initialAnswer}
Available options: ${JSON.stringify(options)}

Which option from the list above most closely matches "${initialAnswer}"?
You MUST select EXACTLY one option from the list as written.
Do not add any explanation. Return only the option text exactly as it appears in the list.
`;

            // Special handling for country/country code questions
            if (isCountryCodeQuestion || options.some(opt => opt.includes("(+") && opt.includes(")"))) {
                refinementPrompt = `
I need to select a country code from a dropdown list.
The user's country is: ${initialAnswer}

Available options in the dropdown: ${JSON.stringify(options)}

IMPORTANT: Please select the option that matches this country, noting that:
1. Country names may be in German (e.g., "Deutschland" for Germany)
2. Options include country codes (e.g., "Deutschland (+49)")
3. For Germany, you should select "Deutschland (+49)"
4. You MUST select EXACTLY one option from the list AS WRITTEN

Which option should I select? Return ONLY the exact text of the option.`;
            }
            
            // Call Ollama API for refinement
            const response = await this.callOllamaAPI({
                model: this.model,
                messages: [
                    {
                        role: "system",
                        content: "You are a helpful assistant that selects the most appropriate option from a list."
                    },
                    {
                        role: "user",
                        content: refinementPrompt
                    }
                ],
                options: { temperature: 0.0 },
                stream: false
            });
            
            let refinedAnswer = response?.message?.content?.trim() || "";
            
            // Check if the refined answer is in the options
            if (options.includes(refinedAnswer)) {
                console.log(`Successfully refined to "${refinedAnswer}"`);
                conversationHistory.addAssistantResponse(refinedAnswer);
                this.sendConversationUpdate();
                return refinedAnswer;
            }
            
            // Special handling for country codes
            if (isCountryCodeQuestion || options.some(opt => opt.includes("(+") && opt.includes(")"))) {
                // Directly look for Deutschland or Germany options
                for (const option of options) {
                    if (option.toLowerCase().includes("deutsch")) {
                        console.log(`Found German option: "${option}"`);
                        conversationHistory.addAssistantResponse(option);
                        this.sendConversationUpdate();
                        return option;
                    }
                }
            }
            
            // If still not in options, do a basic match
            console.log(`Refined answer "${refinedAnswer}" still not in options, using basic matching`);
            
            // Find best match
            let bestMatch = null;
            let bestScore = -1;
            
            for (const option of options) {
                const optionLower = option.toLowerCase();
                const answerLower = initialAnswer.toLowerCase();
                
                // Simple contains matching
                if (optionLower.includes(answerLower) || answerLower.includes(optionLower)) {
                    const score = Math.min(optionLower.length, answerLower.length) / 
                                Math.max(optionLower.length, answerLower.length);
                    
                    if (score > bestScore) {
                        bestScore = score;
                        bestMatch = option;
                    }
                }
            }
            
            // If we found a decent match, use it
            if (bestMatch && bestScore > 0.2) {
                console.log(`Basic matching found: "${bestMatch}" with score ${bestScore}`);
                conversationHistory.addAssistantResponse(bestMatch);
                this.sendConversationUpdate();
                return bestMatch;
            }
            
            // Last resort, return the second option or first if there's only one
            const fallback = options.length > 1 ? options[1] : options[0];
            console.log(`No match found, using fallback: "${fallback}"`);
            conversationHistory.addAssistantResponse(fallback);
            this.sendConversationUpdate();
            return fallback;
            
        } catch (error) {
            console.error('Error in refineOptionSelection:', error);
            // Fallback to second option or first if there's only one
            const fallback = options.length > 1 ? options[1] : options[0];
            conversationHistory.addAssistantResponse(fallback);
            this.sendConversationUpdate();
            return fallback;
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
            
            // Special handling for super common questions without using embeddings
            // Check if this is a direct contact information question
            if (this.user_data?.personal_information) {
                const personalInfo = this.user_data.personal_information;
                
                // Direct matching for common fields
                if (question.toLowerCase().includes("email")) {
                    const email = personalInfo.email || "";
                    if (email) {
                        console.log("Found direct match for email query");
                        conversationHistory.addAssistantResponse(email);
                        
                        // Send the conversation update to the popup
                        this.sendConversationUpdate();
                        
                        return email;
                    }
                }
                
                if (question.toLowerCase().includes("phone") || 
                    question.toLowerCase().includes("mobile") || 
                    question.toLowerCase().includes("telephone") ||
                    question.toLowerCase().includes("telefon")) {
                    
                    console.log("Found direct match for contact query");
                    // Check international prefix is included
                    const phone = personalInfo.phone_prefix 
                        ? personalInfo.phone_prefix.replace('+', '') + personalInfo.phone 
                        : personalInfo.phone || "";
                        
                    if (phone) {
                        conversationHistory.addAssistantResponse(phone);
                        
                        // Send the conversation update to the popup
                        this.sendConversationUpdate();
                        
                        return phone;
                    }
                }
                
                if (question.toLowerCase().includes("name") && question.toLowerCase().includes("first")) {
                    console.log("Found direct match for first name query");
                    const firstName = personalInfo.name || "";
                    if (firstName) {
                        conversationHistory.addAssistantResponse(firstName);
                        
                        // Send the conversation update to the popup
                        this.sendConversationUpdate();
                        
                        return firstName;
                    }
                }
                
                if (question.toLowerCase().includes("name") && question.toLowerCase().includes("last")) {
                    console.log("Found direct match for last name query");
                    const lastName = personalInfo.surname || "";
                    if (lastName) {
                        conversationHistory.addAssistantResponse(lastName);
                        
                        // Send the conversation update to the popup
                        this.sendConversationUpdate();
                        
                        return lastName;
                    }
                }
            }
            
            // Get relevant context - use top 3 results like Python
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
                const prompt = conversationHistory.buildNoOptionsPrompt(
                    question, 
                    relevantContext, 
                    phone, 
                    desiredSalary,
                    this.user_data
                );
                
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
                
                // Remove thinking sections like in Python
                let answerCandidate = rawAnswer.replace(/<think>[\s\S]*?<\/think>/g, "").trim();
                
                // Handle numeric answers like in Python
                const numberKeywords = ["number", "how many", "zahl", "jahre", "years", "salary", "gehalt", "euro", "eur"];
                const isNumericQuestion = numberKeywords.some(keyword => question.toLowerCase().includes(keyword));
                
                if (isNumericQuestion) {
                    const numberMatch = answerCandidate.match(/\d+(?:\.\d+)?/);
                    if (numberMatch) {
                        // Handle experience questions
                        const isExperienceQuestion = ["experience", "erfahrung", "jahre", "years"].some(
                            keyword => question.toLowerCase().includes(keyword)
                        );
                        
                        if (isExperienceQuestion) {
                            const extractedNum = parseFloat(numberMatch[0]);
                            answerCandidate = extractedNum < 1 ? "1" : numberMatch[0];
                        } else {
                            answerCandidate = numberMatch[0];
                        }
                    }
                }
                
                if (answerCandidate) {
                    // Add response to history and reset
                    conversationHistory.addAssistantResponse(answerCandidate);
                    
                    // Send the conversation update to the popup
                    this.sendConversationUpdate();
                    
                    return answerCandidate;
                }
                
                // Fallback response if no candidate is found
                const fallbackResponse = "Information not available";
                conversationHistory.addAssistantResponse(fallbackResponse);
                this.sendConversationUpdate();
                return fallbackResponse;
                
            } catch (ollamaError) {
                console.error("Ollama API error in answerWithNoOptions:", ollamaError);
                
                // Smart fallback based on context when Ollama fails
                console.log("[Function] Falling back to direct context match due to API error");
                
                // If we found relevant information, use the text from the most relevant match
                if (relevantKeys.length > 0) {
                    const directValue = memoryStore.data[relevantKeys[0]]?.text || "";
                    console.log("[Function] AI Answer:", directValue);
                    
                    // For numeric questions, try to extract a number
                    const numberKeywords = ["number", "how many", "zahl", "jahre", "years", "salary", "gehalt", "euro", "eur"];
                    const isNumericQuestion = numberKeywords.some(keyword => question.toLowerCase().includes(keyword));
                    
                    if (isNumericQuestion) {
                        const numberMatch = directValue.match(/\d+(?:\.\d+)?/);
                        if (numberMatch) {
                            console.log("[Function] Extracted number:", numberMatch[0]);
                            conversationHistory.addAssistantResponse(numberMatch[0]);
                            this.sendConversationUpdate();
                            return numberMatch[0];
                        }
                    }
                    
                    // Return the direct value if it's not empty
                    if (directValue && directValue.trim()) {
                        conversationHistory.addAssistantResponse(directValue);
                        this.sendConversationUpdate();
                        return directValue;
                    }
                }
                
                // Special case for phone or salary questions
                const phoneSalaryKeywords = ["phone", "telefon", "salary", "gehalt", "compensation", "vergütung"];
                const isPhoneSalaryQuestion = phoneSalaryKeywords.some(keyword => question.toLowerCase().includes(keyword));
                
                if (isPhoneSalaryQuestion) {
                    if (question.toLowerCase().includes("phone") || question.toLowerCase().includes("telefon")) {
                        conversationHistory.addAssistantResponse(phone || "Not provided");
                        this.sendConversationUpdate();
                        return phone || "Not provided";
                    }
                    if (question.toLowerCase().includes("salary") || question.toLowerCase().includes("gehalt") || 
                        question.toLowerCase().includes("compensation") || question.toLowerCase().includes("vergütung")) {
                        conversationHistory.addAssistantResponse(desiredSalary || "Negotiable");
                        this.sendConversationUpdate();
                        return desiredSalary || "Negotiable";
                    }
                }
                
                const fallbackResponse = "Information not available";
                conversationHistory.addAssistantResponse(fallbackResponse);
                this.sendConversationUpdate();
                return fallbackResponse;
            }
        } catch (error) {
            console.error('Error in answerWithNoOptions:', error);
            const fallbackResponse = "Error generating response";
            conversationHistory.addAssistantResponse(fallbackResponse);
            this.sendConversationUpdate();
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
            
            // Find the latest question for identification - improved to get the full question
            const latestUserMsg = conversation.find(msg => msg.role === 'user');
            if (!latestUserMsg) {
                console.log("No user message found in conversation");
                return;
            }
            
            // Extract the question part for a more reliable identifier
            const questionMatch = latestUserMsg.content.match(/Form Question:\s*([^?]+)\s*\?/);
            const questionId = questionMatch ? questionMatch[1].trim() : latestUserMsg.content.substring(0, 30);
            
            // Add timestamp to questionId to ensure uniqueness
            const uniqueQuestionId = `${questionId}_${Date.now()}`;
            
            console.log(`Sending conversation update to background for question: "${questionId}"`);
            
            // Send the current conversation but don't expect a response
            // Include a timestamp and question ID for better tracking
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
            
            // We don't need to send saved conversations here - they'll be handled
            // during finalizeConversation
        } catch (error) {
            console.error("Error sending conversation update:", error);
        }
    }
    
    /**
     * Finalize the current conversation
     * This should be called when moving to a new form or page
     */
    finalizeConversation() {
        if (this.jobInfo) {
            conversationHistory.finalizeAndSaveConversation(this.jobInfo);
        }
    }
}

export default AIQuestionAnswerer; 